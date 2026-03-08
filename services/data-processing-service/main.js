/* Environment Variables
AWS_REGION, QUEUE_URL, DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, DB_PORT
*/

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { Pool } from 'pg';
import { createClient } from 'redis';

// Config
export const queueUrl = process.env.DATA_PROCESSING_QUEUE_URL;
export const awsRegion = process.env.AWS_REGION || "ap-southeast-1";
export const redisHost = process.env.REDIS_HOST || "localhost";

// AWS Clients
export const sqs = new SQSClient({
  region: awsRegion,
});

export const publisher = createClient({
  url: `redis://${redisHost}:6379`
});
publisher.on('error', (err) => console.error('Redis Client Error', err));

// Publish update to Redis
export async function publishUpdate(trade_id, payload) {
  try{
    const message = JSON.stringify({
      trade_id: trade_id.toString(),
      data: payload
    });
    await publisher.publish('trade-updates', message);
    console.log(`Published to Redis for Trade ID: ${trade_id}`);
  } catch(err) {
    console.error("Redis Publish Error:", err);
  }
}

// Database Connection Pool
export const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  user: process.env.DB_USER,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Keep up to 10 connections open
  idleTimeoutMillis: 30000 // Close idle connections after 30s
});

// Initialise DB & Tables
async function initDB() {
  const createTablesQuery = `
    -- Trades Table
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY, 
      account TEXT, 
      asset_type TEXT, 
      booking_system TEXT, 
      affirmation_system TEXT, 
      clearing_house TEXT, 
      create_time TIMESTAMP, 
      update_time TIMESTAMP, 
      status TEXT
    );

    -- Transactions Table
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY, 
      trade_id INTEGER REFERENCES trades(id), 
      create_time TIMESTAMP, 
      entity TEXT, 
      direction TEXT, 
      type TEXT, 
      status TEXT, 
      update_time TIMESTAMP, 
      step TEXT
    );

    -- Exceptions Table
    CREATE TABLE IF NOT EXISTS exceptions (
      id INTEGER PRIMARY KEY, 
      trade_id INTEGER REFERENCES trades(id), 
      trans_id INTEGER REFERENCES transactions(id), 
      event TEXT, 
      status TEXT, 
      msg TEXT, 
      create_time TIMESTAMP, 
      comment TEXT, 
      priority TEXT, 
      update_time TIMESTAMP
    );

    -- Solutions Table
    CREATE TABLE IF NOT EXISTS solutions (
    id SERIAL PRIMARY KEY,
    exception_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    exception_description TEXT,
    reference_event TEXT,
    solution_description TEXT,
    scores INTEGER NOT NULL,
    create_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_solutions_exception_id 
        FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
    
    -- Score constraint
    CONSTRAINT chk_solutions_scores 
        CHECK (scores >= 0 AND scores <= 27)
    );

    -- Set the sequence to start from 100000 for 6-digit IDs
    ALTER SEQUENCE solutions_id_seq RESTART WITH 100000;

    -- Create indexes for solutions table
    CREATE INDEX IF NOT EXISTS idx_solutions_exception_id ON solutions(exception_id);
    CREATE INDEX IF NOT EXISTS idx_solutions_scores ON solutions(scores DESC);
    CREATE INDEX IF NOT EXISTS idx_solutions_create_time ON solutions(create_time DESC);
  `;
  try {
    await pool.query(createTablesQuery);
    console.log("Database tables verified/created successfully with Integer IDs.");
  } catch (err) {
    console.error("Failed to initialize database tables:", err);
    process.exit(1);
  }
}

async function processData() {
  // Intialise DB
  await initDB();

  // Connect to Redis
  await publisher.connect();
  console.log("Connected to Redis server.");
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20
  };

  console.log("Polling started. Listening for messages...");

  while (true) {
    // Poll from SQS
    try {
      const response = await sqs.send(new ReceiveMessageCommand(params));

      if (!response.Messages || response.Messages.length === 0) {
        continue;
      }

      for (const message of response.Messages) {
        let body;
        try {
          body = JSON.parse(message.Body);
        } catch (jsonErr) {
          console.error("Failed to parse JSON body:", jsonErr);
          await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
          continue;
        }

        const { type, data } = body;

        // process data based on type
        try {
          switch (type) {
            case "trade":
              await handleTrade(data);
              break;
            case "transaction":
              await handleTransaction(data);
              break;
            case "exception":
              await handleException(data);
              break;
            default:
              console.warn(`Unhandled message type: ${type}`);
          }

          // Delete message after successful processing
          await sqs.send(new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle
          }));
          console.log(`Successfully processed and deleted message type: ${type}`);

        } catch (procError) {
          console.error(`Failed to process message [${type}]:`, procError.message);
        }
      }
    } catch (err) {
      console.error("SQS Receive/Network Error:", err);
      await new Promise(res => setTimeout(res, 5000)); // 5s Cool down on network error
    }
  }
}

// --- Handlers ---
export async function handleTrade(trade) {
  const query = `
    INSERT INTO trades (id, account, asset_type, booking_system, affirmation_system, clearing_house, create_time, update_time, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET 
      account = EXCLUDED.account,
      asset_type = EXCLUDED.asset_type,
      booking_system = EXCLUDED.booking_system,
      affirmation_system = EXCLUDED.affirmation_system,
      clearing_house = EXCLUDED.clearing_house,
      create_time = EXCLUDED.create_time,
      update_time = EXCLUDED.update_time,
      status = EXCLUDED.status;
  `;
  const values = [
    parseInt(trade.id), 
    trade.account, trade.asset_type, trade.booking_system, 
    trade.affirmation_system, trade.clearing_house, trade.create_time, 
    trade.update_time, trade.status
  ];
  
  await pool.query(query, values);
  console.log(`Processed Trade ID: ${trade.id}`);
}

export async function handleTransaction(trans) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch existing transaction status if present
    const checkQuery = `SELECT status FROM transactions WHERE id = $1`;
    const checkRes = await client.query(checkQuery, [parseInt(trans.id)]);
    
    const isInsert = checkRes.rowCount === 0;
    const originalStatus = isInsert ? null : checkRes.rows[0].status;

    // Upsert Transaction 
    const insertTransQuery = `
      INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET 
        trade_id = EXCLUDED.trade_id,
        create_time = EXCLUDED.create_time,
        entity = EXCLUDED.entity,
        direction = EXCLUDED.direction,
        type = EXCLUDED.type,
        status = EXCLUDED.status, 
        update_time = EXCLUDED.update_time,
        step = EXCLUDED.step;
    `;
    
    const transValues = [
      parseInt(trans.id), 
      parseInt(trans.trade_id), 
      trans.create_time, trans.entity,
      trans.direction, trans.type, trans.status, trans.update_time, trans.step
    ];
    
    await client.query(insertTransQuery, transValues);

    // Handle Exception Logic based if ORIGINAL status = REJECTED
    let exceptionData = null;

    if (!isInsert && originalStatus === 'REJECTED') {
      const closeExceptionQuery = `
        UPDATE exceptions 
        SET status = 'CLOSED', update_time = $1
        WHERE trans_id = $2
        RETURNING *;
      `;
      const exResult = await client.query(closeExceptionQuery, [trans.update_time, parseInt(trans.id)]);
      exceptionData = exResult.rows[0] || null;
      
      if (exceptionData) {
        console.log(`Exception closed for Transaction ID: ${trans.id}`);
      }
    } else {
      const fetchExceptionQuery = `SELECT * FROM exceptions WHERE trans_id = $1`;
      const exResult = await client.query(fetchExceptionQuery, [parseInt(trans.id)]);
      exceptionData = exResult.rows[0] || null;
    }

    // 4. Update parent Trade status
    const updateTradeQuery = `
      UPDATE trades SET status = $1, update_time = $2 WHERE id = $3;
    `;
    await client.query(updateTradeQuery, [trans.status, trans.update_time, parseInt(trans.trade_id)]);

    await client.query('COMMIT');
    console.log(`Fully Updated Transaction ID: ${trans.id}`);

    // Publish transaction
    await publishUpdate(trans.trade_id, trans);
    console.log(
      `Transaction data sent for Trade ID: ${trans.trade_id}\n`, 
      JSON.stringify(trans, null, 2)
    );

    // Publish exception if exception data present
    if (exceptionData) {
      await publishUpdate(trans.trade_id, exceptionData);
      console.log(
        `Exception data sent for Trade ID: ${trans.trade_id}\n`, 
        JSON.stringify(exceptionData, null, 2)
      );
    }

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function handleException(excep) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the Exception
    const insertExcepQuery = `
      INSERT INTO exceptions (id, trade_id, trans_id, status, msg, create_time, comment, priority, update_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING;
    `;
    const excepValues = [
      parseInt(excep.id), 
      parseInt(excep.trade_id), 
      parseInt(excep.trans_id), 
      excep.status, excep.msg, excep.create_time, 
      excep.comment, excep.priority, excep.update_time
    ];
    await client.query(insertExcepQuery, excepValues);

    // Update Transaction to REJECTED and grab the updated row
    const updateTransQuery = `
      UPDATE transactions 
      SET status = 'REJECTED', update_time = $1 
      WHERE id = $2
      RETURNING *;
    `;
    const transResult = await client.query(updateTransQuery, [excep.update_time, parseInt(excep.trans_id)]);
    const updatedTransaction = transResult.rows[0]; // This is the fully updated transaction

    // Update Trade to REJECTED
    await client.query(
      `UPDATE trades SET status = 'REJECTED', update_time = $1 WHERE id = $2`, 
      [excep.update_time, parseInt(excep.trade_id)]
    );

    // Commit Database Transaction
    await client.query('COMMIT');
    console.log(`Processed Exception ID: ${excep.id}`);

    // Publish Exception
    await publishUpdate(excep.trade_id, { type: 'exception', data: excep });
    console.log(
      `Send to Redis for exception with Trade ID: ${excep.trade_id}\n`, 
      JSON.stringify(excep, null, 2)
    );

    // Publish transaction with the status = REJECTED
    if (updatedTransaction) {
      await publishUpdate(excep.trade_id, { type: 'transaction', data: updatedTransaction });
      console.log(
        `Send to redis transaction with Trade ID: ${excep.trade_id}\n`, 
        JSON.stringify(updatedTransaction, null, 2)
      );
    }

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

processData().catch(console.error);

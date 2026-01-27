/* Environment Variables
AWS_REGION, QUEUE_URL, DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, DB_PORT
*/

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { Pool } from 'pg';

// Config
const queueUrl = process.env.QUEUE_URL;
const awsRegion = process.env.AWS_REGION || "ap-southeast-1";

// AWS Clients
const sqs = new SQSClient({
  region: awsRegion,
});

// Database Connection Pool
const pool = new Pool({
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
      transaction_id INTEGER REFERENCES transactions(id), 
      event TEXT, 
      status TEXT, 
      msg TEXT, 
      create_time TIMESTAMP, 
      comment TEXT, 
      priority TEXT, 
      update_time TIMESTAMP
    );
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
          console.error("Failed to parse JSON body:", message.Body);
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
async function handleTrade(trade) {
  const query = `
    INSERT INTO trades (id, account, asset_type, booking_system, affirmation_system, clearing_house, create_time, update_time, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET 
      status = EXCLUDED.status,
      update_time = EXCLUDED.update_time; 
  `;
  const values = [
    parseInt(trade.id), // Ensure INT
    trade.account, trade.asset_type, trade.booking_system, 
    trade.affirmation_system, trade.clearing_house, trade.create_time, 
    trade.update_time, trade.status
  ];
  
  await pool.query(query, values);
  console.log(`Processed Trade ID: ${trade.id}`);
}

async function handleTransaction(trans) {
  // Manual client connect for Transaction (BEGIN/COMMIT)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertTransQuery = `
      INSERT INTO transactions (id, trade_id, create_time, entity, direction, type, status, update_time, step)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status, 
        update_time = EXCLUDED.update_time;
    `;
    const transValues = [
      parseInt(trans.id), 
      parseInt(trans.trade_id), 
      trans.create_time, trans.entity,
      trans.direction, trans.type, trans.status, trans.update_time, trans.step
    ];
    await client.query(insertTransQuery, transValues);

    // Update parent Trade status
    const updateTradeQuery = `
      UPDATE trades SET status = $1, update_time = $2 WHERE id = $3;
    `;
    await client.query(updateTradeQuery, [trans.status, trans.update_time, parseInt(trans.trade_id)]);

    await client.query('COMMIT');
    console.log(`Processed Transaction ID: ${trans.id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release(); // IMPORTANT: Release client back to pool
  }
}

async function handleException(excep) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertExcepQuery = `
      INSERT INTO exceptions (id, trade_id, transaction_id, status, msg, create_time, comment, priority, update_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING;
    `;
    const excepValues = [
      parseInt(excep.id), 
      parseInt(excep.trade_id), 
      parseInt(excep.transaction_id), 
      excep.status, excep.msg, excep.create_time, 
      excep.comment, excep.priority, excep.update_time
    ];
    await client.query(insertExcepQuery, excepValues);

    // Update Transaction and Trade to REJECTED
    await client.query(
      `UPDATE transactions SET status = 'REJECTED', update_time = $1 WHERE id = $2`, 
      [excep.update_time, parseInt(excep.transaction_id)]
    );
    
    await client.query(
      `UPDATE trades SET status = 'REJECTED', update_time = $1 WHERE id = $2`, 
      [excep.update_time, parseInt(excep.trade_id)]
    );

    await client.query('COMMIT');
    console.log(`Processed Exception ID: ${excep.id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

processData().catch(console.error);
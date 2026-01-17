/* Environment Variables
AWS_REGION, QUEUE_URL, DB_HOST,DB_NAME, DB_PASSWORD, DB_USER, DB_PORT
*/

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { Client } from 'pg';

const queueUrl = process.env.QUEUE_URL;

const sqs = new SQSClient({
  region: process.env.AWS_REGION,
});

const db = new Client({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  user: process.env.DB_USER, 
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function initDB() {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS trades (
      trade_id TEXT PRIMARY KEY, 
      account TEXT, 
      asset_type TEXT, 
      booking_system TEXT, 
      affirmation_system TEXT, 
      clearing_house TEXT, 
      create_time TIMESTAMP, 
      update_time TIMESTAMP, 
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      trans_id TEXT PRIMARY KEY, 
      trade_id TEXT REFERENCES trades(trade_id), 
      create_time TIMESTAMP, 
      entity TEXT, 
      direction TEXT, 
      type TEXT, 
      status TEXT, 
      update_time TIMESTAMP, 
      step TEXT
    );

    CREATE TABLE IF NOT EXISTS exceptions (
      excep_id TEXT PRIMARY KEY, 
      trade_id TEXT REFERENCES trades(trade_id), 
      trans_id TEXT, 
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
    await db.query(createTablesQuery);
    console.log("Database tables verified/created successfully.");
  } catch (err) {
    console.error("Failed to initialize database tables:", err);
    throw err; // Stop the app if we can't create tables
  }
}

async function processData() {
  //connect to DB
  await db.connect();
  console.log("Connected to DB");


  // Initialise DB tables if they don'y exist
  await initDB();

  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20
  };

  while (true) {
    try {
      console.log("Listening to messages");
      const response = await sqs.send(new ReceiveMessageCommand(params));
      console.log(response);

      if (!response.Messages) {
        console.log("Polling... No messages found."); 
        continue;
      }

      if (response.Messages) {
        for (const message of response.Messages) {
          const body = JSON.parse(message.Body);
          const { type, data } = body;

          // handles messages
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
                console.error(`Unhandled message type: ${type}`);
                continue; // Skip to next message instead of killing loop
            }

            // Success: Delete message
            await sqs.send(new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle
            }));
          } catch (e) {
            console.error(`Failed to process message [${type}]:`, e.message);
            // We DON'T delete the message here so SQS retries it
          }
        }
      }
    } catch (err) {
      console.error("SQS Receive Error:", err);
      await new Promise(res => setTimeout(res, 5000)); // Cool down
    }
  }
}

// handle trade data
async function handleTrade(trade) {
  const query = `
    INSERT INTO trades (trade_id, account, asset_type, booking_system, affirmation_system, clearing_house, create_time, update_time, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (trade_id) DO NOTHING; 
  `;
  const values = [
    trade.trade_id, trade.account, trade.asset_type, trade.booking_system, 
    trade.affirmation_system, trade.clearing_house, trade.create_time, 
    trade.update_time, trade.status
  ];
  
  const result = await db.query(query, values);
  console.log(result.rowCount === 0 ? `Trade ${trade.trade_id} exists.` : `Inserted Trade ${trade.trade_id}`);
}

// Handle transaction data (to add push to websocket)
async function handleTransaction(trans) {
  try {
    await db.query('BEGIN');

    const insertTransQuery = `
      INSERT INTO transactions (trade_id, trans_id, create_time, entity, direction, type, status, update_time, step)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (trans_id) DO NOTHING;
    `;
    // Ensure trans.Step matches the casing in your JSON!
    const transValues = [
      trans.trade_id, trans.trans_id, trans.create_time, trans.entity,
      trans.direction, trans.type, trans.status, trans.update_time, trans.step
    ];
    await db.query(insertTransQuery, transValues);

    const updateTradeQuery = `
      UPDATE trades SET status = $1, update_time = $2 WHERE trade_id = $3;
    `;
    await db.query(updateTradeQuery, [trans.status, trans.update_time, trans.trade_id]);

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// Hanlde exception data (to add push to websocket)
async function handleException(excep) {
  try {
    await db.query('BEGIN');

    const insertExcepQuery = `
      INSERT INTO exceptions (trade_id, trans_id, excep_id, status, msg, create_time, comment, priority, update_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (excep_id) DO NOTHING;
    `;
    const excepValues = [
      excep.trade_id, excep.trans_id, excep.excep_id, 
      excep.status, excep.msg, excep.create_time, 
      excep.comment, excep.priority, excep.update_time
    ];
    await db.query(insertExcepQuery, excepValues);

    // Update Transaction and Trade to REJECTED
    await db.query(`UPDATE transactions SET trans_status = 'REJECTED', update_time = $1 WHERE trans_id = $2`, [excep.update_time, excep.trans_id]);
    await db.query(`UPDATE trades SET status = 'REJECTED', update_time = $1 WHERE trade_id = $2`, [excep.update_time, excep.trade_id]);

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

processData().catch(console.error);
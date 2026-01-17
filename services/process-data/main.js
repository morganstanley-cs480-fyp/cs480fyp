import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { Client } from 'pg';

const queueUrl = process.env.QUEUE_URL;
// Check if we are pointing to LocalStack
const isLocal = queueUrl && (queueUrl.includes("localstack") || queueUrl.includes("localhost"));

const sqs = new SQSClient({
  region: "ap-southeast-1",
  ...(isLocal && {
    // FIX A: Endpoint must be the BASE URL only (no queue path)
    endpoint: "http://localstack:4566", 
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
      sessionToken: undefined
    },
    // FIX B: This silences the "QueueUrl differs" warning
    useQueueUrlAsEndpoint: true
  })
});

const db = new Client({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  user: process.env.DB_USER, 
  port: 5432,
});

async function processData() {
  await db.connect();
  console.log("Connected to DB and listening for SQS messages...");

  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20
  };

  while (true) {
    try {
      console.log("Connected to SQS queue");
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

// FIX 1: Corrected Placeholders ($1 to $9)
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

// FIX 2: Fixed variable mapping (trans.status vs trans.trans_status)
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

// FIX 3: Consistent column names
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
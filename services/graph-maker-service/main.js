import neo4j from 'neo4j-driver';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

// 1. Configuration
const region = process.env.AWS_REGION || "ap-southeast-1";
const boltUrl = process.env.NEPTUNE_ENDPOINT || "bolt://neo4j:7687";
const queueUrl = process.env.GRAPH_INGESTION_QUEUE_URL || "http://localstack:4566/000000000000/graph-ingestion-queue"; 

// 2. Initialize Clients
const driver = neo4j.driver(
  boltUrl,
  neo4j.auth.none(), // Neptune/Local Neo4j setup
  { 
    encrypted: 'ENCRYPTION_ON', 
    trust: "TRUST_ALL_CERTIFICATES"
  }
);

const sqsClient = new SQSClient({
  region: region
});

// 3. The Cypher Query Logic
export const processGraphData = async (session, data) => {
  const cypherQuery = `
    // 1. CORE TRADE DATA
    // This part should always run. It creates the 'Anchor' for everything else.
    MERGE (t:Trade {id: $trade_id})
    SET t.account = $account, 
        t.asset_type = $asset_type, 
        t.status = $trade_status,
        t.created_at = datetime($created_at)

    // 2. TRADE-LEVEL ENTITIES (Static Meta-data)
    CALL {
      WITH t
      WITH t WHERE $booking_system IS NOT NULL
      MERGE (b:Entity {name: $booking_system})
      MERGE (t)-[:BOOKED_ON]->(b)
    }

    CALL {
      WITH t
      WITH t WHERE $affirmation_system IS NOT NULL
      MERGE (a:Entity {name: $affirmation_system})
      MERGE (t)-[:AFFIRMED_BY]->(a)
    }

    CALL {
      WITH t
      WITH t WHERE $clearing_house IS NOT NULL
      MERGE (c:Entity {name: $clearing_house})
      MERGE (t)-[:CLEARED_BY]->(c)
    }

    // 3. TRANSACTION DATA (The 'Event' Step)
    CALL {
      WITH t
      WITH t WHERE $trans_id IS NOT NULL
      MERGE (tx:Transaction {id: $trans_id})
      SET tx.step = toInteger($step), 
          tx.type = $type, 
          tx.status = $trans_status, 
          tx.direction = $direction,
          tx.created_at = datetime($trans_created_at)
      
      // Link the transaction to the parent trade
      MERGE (t)-[:HAS_TRANSACTION]->(tx)

      // 4. TRANSACTION ENTITY (The Counterparty)
      CALL {
        WITH tx
        WITH tx WHERE $entity IS NOT NULL
        MERGE (party:Entity {name: $entity})
        
        // Conditional relationship based on money/asset flow direction
        CALL {
          WITH tx, party
          WITH tx, party WHERE $direction = 'receive'
          MERGE (tx)-[:RECEIVED_FROM]->(party)
        }
        CALL {
          WITH tx, party
          WITH tx, party WHERE $direction = 'send'
          MERGE (tx)-[:SENT_TO]->(party)
        }
      }

      // 5. EXCEPTION DATA (The Error)
      CALL {
        WITH tx
        WITH tx WHERE $excep_id IS NOT NULL
        MERGE (e:Exception {id: $excep_id})
        SET e.priority = $priority, 
            e.status = $excep_status, 
            e.msg = $msg,
            e.comment = $comment,
            e.created_at = datetime($excep_created_at)
        MERGE (tx)-[:GENERATED_EXCEPTION]->(e)
      }
    }
  `;

  await session.run(cypherQuery, {
    trade_id: String(data.trade_id),
    account: data.account,
    asset_type: data.asset_type,
    booking_system: data.booking_system,
    affirmation_system: data.affirmation_system,
    clearing_house: data.clearing_house,
    trade_status: data.trade_status,
    created_at: data.created_at || new Date().toISOString(),
    trans_id: data.trans_id ? String(data.trans_id) : null,
    trans_status: data.trans_status,
    step: data.step,
    type: data.type,
    direction: data.direction,
    trans_created_at: data.trans_created_at || new Date().toISOString(),
    entity: data.entity,
    excep_id: data.excep_id ? String(data.excep_id) : null,
    excep_status: data.excep_status,
    comment: data.comment,
    priority: data.priority,
    msg: data.msg,
    excep_created_at: data.excep_created_at || new Date().toISOString()
  });
};

// 4. The Polling Loop (This keeps the service alive)
async function startPolling() {
  console.log("🚀 Graph Maker Service Started. Listening for messages...");

  while (true) {
    try {
      const response = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20 // Long polling
      }));

      if (response.Messages) {
        const session = driver.session();
        for (const message of response.Messages) {
          const data = JSON.parse(message.Body);
          console.log(`Processing message for Trade: ${data.trade_id}`);
          
          await processGraphData(session, data);

          // Delete message after successful processing
          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle
          }));
        }
        await session.close();
      }
    } catch (err) {
      console.error("❌ Polling Error:", err);
      await new Promise(res => setTimeout(res, 5000)); // Cool down
    }
  }
}

startPolling();
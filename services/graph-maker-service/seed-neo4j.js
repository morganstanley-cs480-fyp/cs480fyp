/**
 * seed-neo4j.js
 *
 * Reads all trades, transactions, and exceptions from the local PostgreSQL
 * instance and populates the local Neo4j container using the same Cypher
 * query as the graph-maker-service.
 *
 * Usage (from services/graph-maker-service/):
 *   node seed-neo4j.js
 *
 * Or with custom connection strings:
 *   PG_HOST=localhost NEO4J_URI=bolt://localhost:7687 node seed-neo4j.js
 */

import neo4j from 'neo4j-driver';
import pg from 'pg';

const { Pool } = pg;

// Inlined from main.js to avoid triggering the SQS polling loop on import
const processGraphData = async (session, data) => {
  const cypherQuery = `
    MERGE (t:Trade {id: $trade_id})
    SET t.account = $account,
        t.asset_type = $asset_type,
        t.status = $trade_status,
        t.created_at = datetime($created_at)

    FOREACH (_ IN CASE WHEN $booking_system IS NOT NULL THEN [1] ELSE [] END |
      MERGE (b:Entity {name: $booking_system})
      MERGE (t)-[:BOOKED_ON]->(b)
    )
    FOREACH (_ IN CASE WHEN $affirmation_system IS NOT NULL THEN [1] ELSE [] END |
      MERGE (a:Entity {name: $affirmation_system})
      MERGE (t)-[:AFFIRMED_BY]->(a)
    )
    FOREACH (_ IN CASE WHEN $clearing_house IS NOT NULL THEN [1] ELSE [] END |
      MERGE (c:Entity {name: $clearing_house})
      MERGE (t)-[:CLEARED_BY]->(c)
    )

    FOREACH (_ IN CASE WHEN $trans_id IS NOT NULL THEN [1] ELSE [] END |
      MERGE (tx:Transaction {id: $trans_id})
      SET tx.step = toInteger($step),
          tx.type = $type,
          tx.status = $trans_status,
          tx.direction = $direction,
          tx.created_at = datetime($trans_created_at)
      MERGE (t)-[:HAS_TRANSACTION]->(tx)

      FOREACH (__ IN CASE WHEN $entity IS NOT NULL THEN [1] ELSE [] END |
        MERGE (party:Entity {name: $entity})
        FOREACH (___ IN CASE WHEN $direction = 'receive' THEN [1] ELSE [] END | MERGE (tx)-[:RECEIVED_FROM]->(party))
        FOREACH (___ IN CASE WHEN $direction = 'send' THEN [1] ELSE [] END | MERGE (tx)-[:SENT_TO]->(party))
      )

      FOREACH (__ IN CASE WHEN $excep_id IS NOT NULL THEN [1] ELSE [] END |
        MERGE (e:Exception {id: $excep_id})
        SET e.priority = $priority,
            e.status = $excep_status,
            e.msg = $msg,
            e.comment = $comment,
            e.created_at = datetime($excep_created_at)
        MERGE (tx)-[:GENERATED_EXCEPTION]->(e)
      )
    )
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
    excep_created_at: data.excep_created_at || new Date().toISOString(),
  });
};

const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB || 'trading_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

const boltUrl = process.env.NEO4J_URI || 'bolt://localhost:7687';

const driver = neo4j.driver(
  boltUrl,
  neo4j.auth.none(),
  { encrypted: 'ENCRYPTION_OFF' }
);

const QUERY = `
  SELECT
    t.id            AS trade_id,
    t.account,
    t.asset_type,
    t.booking_system,
    t.affirmation_system,
    t.clearing_house,
    t.status        AS trade_status,
    t.create_time   AS created_at,
    tx.id           AS trans_id,
    tx.step,
    tx.type,
    tx.status       AS trans_status,
    tx.direction,
    tx.entity,
    tx.create_time  AS trans_created_at,
    ex.id           AS excep_id,
    ex.status       AS excep_status,
    ex.priority,
    ex.comment,
    ex.msg,
    ex.create_time  AS excep_created_at
  FROM trades t
  LEFT JOIN transactions tx ON tx.trade_id = t.id
  LEFT JOIN exceptions   ex ON ex.trans_id = tx.id
  ORDER BY t.id, tx.id, ex.id
`;

async function seed() {
  console.log(`Connecting to PostgreSQL at ${pgPool.options.host}:${pgPool.options.port}...`);
  console.log(`Connecting to Neo4j at ${boltUrl}...`);

  const session = driver.session();

  try {
    const { rows } = await pgPool.query(QUERY);
    console.log(`Found ${rows.length} row(s) to process.`);

    let processed = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        await processGraphData(session, {
          trade_id: row.trade_id,
          account: row.account,
          asset_type: row.asset_type,
          booking_system: row.booking_system,
          affirmation_system: row.affirmation_system,
          clearing_house: row.clearing_house,
          trade_status: row.trade_status,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          trans_id: row.trans_id,
          step: row.step,
          type: row.type,
          trans_status: row.trans_status,
          direction: row.direction,
          entity: row.entity,
          trans_created_at: row.trans_created_at ? new Date(row.trans_created_at).toISOString() : new Date().toISOString(),
          excep_id: row.excep_id,
          excep_status: row.excep_status,
          priority: row.priority,
          comment: row.comment,
          msg: row.msg,
          excep_created_at: row.excep_created_at ? new Date(row.excep_created_at).toISOString() : new Date().toISOString(),
        });
        processed++;
        if (processed % 100 === 0) {
          console.log(`  ... ${processed} rows processed`);
        }
      } catch (err) {
        console.error(`  Row error (trade_id=${row.trade_id}):`, err.message);
        errors++;
      }
    }

    console.log(`\nDone. ${processed} rows processed, ${errors} errors.`);
  } finally {
    await session.close();
    await driver.close();
    await pgPool.end();
  }
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

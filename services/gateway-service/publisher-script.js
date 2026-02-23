import { createClient } from 'redis';

const redis = createClient({
  url: 'redis://localhost:6379'
});

await redis.connect();

// Function to send manual transaction updates for a specific trade
async function sendTransactionUpdate(tradeId, transactionData) {
  const message = JSON.stringify({
    trade_id: tradeId,
    data: transactionData  // This should match your Transaction interface
  });
  
  await redis.publish('trade-updates', message);
  console.log(`📡 Sent transaction update for trade ${tradeId}:`, transactionData);
}

// Example transaction updates for trade 96809076 (from your mock data)
const sampleTransactionUpdates = [
      {
    "trans_id": 38982571,
    "trade_id": 96809076,
    "create_time": new Date().toISOString(),
    "entity": "TAS",
    "direction": "SEND",
    "type": "CREDIT_CHECK",
    "status": "CLEARED",
    "update_time": new Date().toISOString(),
    "step": 2
},
{
    "trans_id": 31546215,
    "trade_id": 96809076,
    "create_time": new Date().toISOString(),
    "entity": "TAS",
    "direction": "RECEIVE",
    "type": "CREDIT_APPROVE",
    "status": "CLEARED",
    "update_time": new Date().toISOString(),
    "step": 3
},
{
    "trans_id": 49097669,
    "trade_id": 96809076,
    "create_time": new Date().toISOString(),
    "entity": "OCTCCHK",
    "direction": "SEND",
    "type": "CONSENT_GRANTED",
    "status": "ALLEGED",
    "update_time": new Date().toISOString(),
    "step": 4
},
//   {
//     trans_id: 99999999,  // New transaction
//     trade_id: 96809076,
//     create_time: new Date().toISOString(),
//     entity: "BANK_OF_AMERICA",
//     direction: "SEND",
//     type: "CREDIT_CHECK", 
//     status: "PENDING",
//     update_time: new Date().toISOString(),
//     step: 11  // Next step after existing ones
//   },
//   {
//     trans_id: 99999999,  // Update existing transaction
//     trade_id: 96809076,
//     create_time: new Date().toISOString(),
//     entity: "BANK_OF_AMERICA", 
//     direction: "SEND",
//     type: "CREDIT_CHECK",
//     status: "COMPLETED",  // Status changed
//     update_time: new Date().toISOString(),
//     step: 11
//   },
//   {
//     trans_id: 88888888,  // Another new transaction
//     trade_id: 96809076,
//     create_time: new Date().toISOString(),
//     entity: "WELLS_FARGO",
//     direction: "RECEIVE", 
//     type: "SETTLEMENT_CONFIRM",
//     status: "PENDING",
//     update_time: new Date().toISOString(),
//     step: 12
//   }
];

// Send updates with delays to simulate real-time
console.log('🚀 Starting transaction updates...');
for (const update of sampleTransactionUpdates) {
  await sendTransactionUpdate(update.trade_id, update);
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between updates
}

console.log('✅ All updates sent!');
process.exit(0);
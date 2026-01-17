import fs from 'fs/promises'
import { XMLParser } from 'fast-xml-parser'
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

// 1. Define the variable here
const queueUrl = process.env.QUEUE_URL; 

const sqs = new SQSClient({
  region: "ap-southeast-1",
  // Configure endpoint for Docker internal networking
  endpoint: isLocal ? "http://localstack:4566" : undefined,
  credentials: { accessKeyId: "test", secretAccessKey: "test", sessionToken: undefined },
  useQueueUrlAsEndpoint: true
})

async function ingestData() {
  const parser = new XMLParser ({preserveOrder: true});
  console.log("Ingestor Start")
  
  const XML_FILE = "data.xml";
  const STATE_FILE = "state.json";

  while (true) {
    try {
      // Fetch last position from file
      let state = {lastPos : 0};
      try {
        const stateContent = await fs.readFile(STATE_FILE, 'utf-8');
        state = JSON.parse(stateContent);
      } catch (e) {
        console.error("Pointer not found, starting from 0")
      }

      // Read XML
      const xmlData = await fs.readFile(XML_FILE, 'utf-8');
      const parsed = parser.parse(xmlData);

      const rootNode = parsed.find(n => n.root);
      const allEntries = rootNode.root.filter(node => !node['#text']);

      // get the next 2 data entries
      const batch = allEntries.slice(state.lastPos, state.lastPos + 2);

      if (batch.length > 0){
        for (const entry of batch) {
          const type = Object.keys(entry)[0];
          const fields = entry[type];
  
          const cleanFields = cleanUpFields(fields);
          // Fallback if trade_id is missing to prevent crash
          const tradeId = cleanFields.trade_id || "unknown";

          console.log(JSON.stringify({type, data: cleanFields}));

          await sqs.send(new SendMessageCommand({
            // 2. FIX: Use 'queueUrl' (matching the top of the file)
            QueueUrl: queueUrl, 
            MessageBody: JSON.stringify({ type, data: cleanFields }),
            MessageGroupId: String(tradeId),
          }))
          state.lastPos++;
        }
      } else {
        console.log("No more entries")
      }

      await fs.writeFile(STATE_FILE, JSON.stringify(state));
      console.log(`Progress saved. Current index: ${state.lastPos}`);
      
    } catch (error) {
      console.error("Ingestion Error Details:", error.message);
      console.error(error);
    }

    // Wait 10 seconds before next batch
    await new Promise(res => setTimeout(res, 10000))
  }
}

// Helper: Flattens XML structure
function cleanUpFields(fields) {
  const cleanObj = {};
  fields.forEach(field => {
      const key = Object.keys(field)[0]; 
      const value = field[key][0]['#text']; 
      cleanObj[key] = value;
  });
  return cleanObj;
}

ingestData();
/* Environment Variables
QUEUE_URL, S3_BUCKET_NAME, S3_FILE_KEY, SSM_PARAM_NAME, AWS_REGION, BATCH_SIZE
*/

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand, PutParameterCommand } from "@aws-sdk/client-ssm";
import { XMLParser } from 'fast-xml-parser';

// Config
const queueUrl = process.env.QUEUE_URL;
const bucketName = process.env.S3_BUCKET_NAME;
const fileName = process.env.S3_FILE_KEY || "data.xml";
const ssmParamName = process.env.SSM_PARAM_NAME || "/trade-ingestor/last-pos";
const region = process.env.AWS_REGION || "ap-southeast-1";
const batchSize = parseInt(process.env.BATCH_SIZE || "10", 10);

// AWS Clients
const sqs = new SQSClient({ region });
const s3 = new S3Client({ region });
const ssm = new SSMClient({ region });

async function ingestData() {
  const parser = new XMLParser({ preserveOrder: true });
  console.log("Ingestor Service Started (AWS Production Mode)");
  console.log(`Region: ${region}`);
  console.log(`Target: S3[${bucketName}/${fileName}] -> Queue -> SSM[${ssmParamName}]`);

  let allEntries = [];

  try {
    // Read XML once at startup
    const xmlData = await fetchS3File(bucketName, fileName);
    const parsed = parser.parse(xmlData);
    
    // Parse Logic
    const rootNode = parsed.find(n => n.root);
    if (!rootNode) throw new Error("Invalid XML: Root node not found");
    
    allEntries = rootNode.root.filter(node => !node['#text']);
    console.log(`Successfully loaded ${allEntries.length} entries from S3.`);
    
  } catch (err) {
    console.error("CRITICAL: Failed to load or parse XML from S3.", err.message);
    process.exit(1); 
  }

  while (true) {
    try {
      // GET STATE (FROM SSM)
      let lastPos = await getLastPosition(ssmParamName);
      
      // slice items (Process next 10 items)
      const batch = allEntries.slice(lastPos, lastPos + batchSize);

      if (batch.length > 0) {
        for (const entry of batch) {
          const type = Object.keys(entry)[0];
          const fields = entry[type];

          const cleanFields = cleanUpFields(fields);
        
          const tradeId = cleanFields.trade_id || "unknown";

          console.log(`Sending [${type}] TradeID: ${tradeId}`);

          // send SQS based on FIFO and Message Group ID (Trade ID)
          await sqs.send(new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({ type, data: cleanFields }),
            MessageGroupId: String(tradeId), 
            MessageDeduplicationId: `${type}-${tradeId}-${Date.now()}` // Optional: Unique ID to prevent dupes
          }));

          lastPos++;
        }

        // save state to SSM
        await saveLastPosition(ssmParamName, lastPos);
        console.log(`Batch success. SSM Updated to index: ${lastPos}`);

      } else {
        console.log("No more entries to process. Waiting...");
      }

    } catch (error) {
      console.error("Ingestion Loop Error:", error.message);
    }

    // Wait 60 seconds before next batch
    await new Promise(res => setTimeout(res, 60000));
  }
}

// fetch XML file from S3 bucket
async function fetchS3File(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  return response.Body.transformToString();
}

// get last position of the pointer on the XML file to ensure no overlap
async function getLastPosition(paramName) {
  try {
    const command = new GetParameterCommand({ Name: paramName });
    const response = await ssm.send(command);
    return parseInt(response.Parameter.Value, 10);
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      console.log("SSM Parameter not found. Initializing at 0.");
      return 0;
    }
    throw error;
  }
}

// write the position of the pointer of the next data to be sent after 60s 
async function saveLastPosition(paramName, pos) {
  const command = new PutParameterCommand({
    Name: paramName,
    Value: String(pos),
    Type: "String",
    Overwrite: true
  });
  await ssm.send(command);
}

// clean up fields from XML to JSON
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
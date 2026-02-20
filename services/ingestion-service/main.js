/* Environment Variables
QUEUE_URL, S3_BUCKET_NAME, S3_FILE_KEY, SSM_PARAM_NAME, AWS_REGION, BATCH_SIZE
*/

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand, PutParameterCommand } from "@aws-sdk/client-ssm";
import { XMLParser } from 'fast-xml-parser';

// Config
export const config = {
  queueUrl: process.env.DATA_PROCESSING_QUEUE_URL,
  bucketName: process.env.S3_BUCKET_NAME,
  fileName: process.env.S3_FILE_KEY || "data.xml",
  ssmParamName: process.env.SSM_PARAM_NAME || "/trade-ingestor/last-pos",
  region: process.env.AWS_REGION || "ap-southeast-1",
  batchSize: parseInt(process.env.BATCH_SIZE || "10", 10),
  awsEndPoint: process.env.AWS_ENDPOINT 
};

// AWS Clients
const sqs = new SQSClient({ region: config.region,
                            forcePathStyle: true,
                            endpoint: config.awsEndPoint
                            });
const s3 = new S3Client({ region: config.region,
                          endpoint: config.awsEndPoint,
                          forcePathStyle: true
                         });
const ssm = new SSMClient({ region: config.region,
                            endpoint: config.awsEndPoint,
                            forcePathStyle: true
                            });

// Export clients for mocking if needed
export const clients = { sqs, s3, ssm };

export async function ingestData() {
  const parser = new XMLParser({ preserveOrder: true });
  console.log("Ingestor Service Started (AWS Production Mode)");

  let allEntries = [];

  try {
    const xmlData = await fetchS3File(config.bucketName, config.fileName);
    const parsed = parser.parse(xmlData);
    
    const rootNode = parsed.find(n => n.root);
    if (!rootNode) throw new Error("Invalid XML: Root node not found");
    
    // Filter out text nodes (newlines/indentation)
    allEntries = rootNode.root.filter(node => !node['#text']);
    console.log(`Successfully loaded ${allEntries.length} entries from S3.`);
    
  } catch (err) {
    console.error("CRITICAL: Failed to load or parse XML from S3.", err.message);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    throw err;
  }

  while (true) {
    try {
      const lastPos = await getLastPosition(config.ssmParamName);
      await processBatch(allEntries, lastPos);
      // For testing purposes, we break the loop if requested
      if (process.env.NODE_ENV === 'test') break;

      await new Promise(res => setTimeout(res, 60000));
      
      // Update position only after wait or successful cycle
    } catch (error) {
      console.error("Ingestion Loop Error:", error.message);
      if (process.env.NODE_ENV === 'test') break;
    }
  }
}

// Logic extracted for easier testing
export async function processBatch(allEntries, lastPos) {
  const batch = allEntries.slice(lastPos, lastPos + config.batchSize);

  if (batch.length > 0) {
    let currentPos = lastPos;
    for (const entry of batch) {
      const type = Object.keys(entry)[0];
      const fields = entry[type];
      const cleanFields = cleanUpFields(fields);
      const tradeId = (type === 'trade') 
        ? cleanFields.id 
        : (cleanFields.trade_id || "unknown");

      console.log(`Sending [${type}] TradeID: ${tradeId}`);

      await clients.sqs.send(new SendMessageCommand({
        QueueUrl: config.queueUrl,
        MessageBody: JSON.stringify({ type, data: cleanFields }),
        MessageGroupId: String(tradeId), 
        MessageDeduplicationId: `${type}-${tradeId}-${Date.now()}`
      }));

      currentPos++;
    }

    await saveLastPosition(config.ssmParamName, currentPos);
    console.log(`Batch success. SSM Updated to index: ${currentPos}`);
    return currentPos;
  } else {
    console.log("No more entries to process.");
    return lastPos;
  }
}

export async function fetchS3File(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await clients.s3.send(command);
  return response.Body.transformToString();
}

export async function getLastPosition(paramName) {
  try {
    const command = new GetParameterCommand({ Name: paramName });
    const response = await clients.ssm.send(command);
    return parseInt(response.Parameter.Value, 10);
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      console.log("SSM Parameter not found. Initializing at 0.");
      return 0;
    }
    throw error; 
  }
}

export async function saveLastPosition(paramName, pos) {
  const command = new PutParameterCommand({
    Name: paramName,
    Value: String(pos),
    Type: "String",
    Overwrite: true
  });
  await clients.ssm.send(command);
}

export function cleanUpFields(fields) {
  const cleanObj = {};
  fields.forEach(field => {
    const key = Object.keys(field)[0];
    if (field[key] && field[key][0] && field[key][0]['#text']) {
        const value = field[key][0]['#text'];
        cleanObj[key] = value;
    }
  });
  return cleanObj;
}

// Only run immediately if this file is the main entry point (not imported by test)
if (process.argv[1] && process.argv[1].endsWith('main.js')) {
    ingestData();
}

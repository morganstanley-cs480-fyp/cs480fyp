import { mockClient } from "aws-sdk-client-mock";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand, PutParameterCommand } from "@aws-sdk/client-ssm";
import 'aws-sdk-client-mock-jest'

import {
  fetchS3File,
  getLastPosition,
  saveLastPosition,
  cleanUpFields,
  processBatch,
  clients,
  config
} from './main.js'

const sqsMock = mockClient(SQSClient)
const s3Mock = mockClient(S3Client)
const ssmMock = mockClient(SSMClient)

const SAMPLE_XML_BODY = `
<root>
  <trade>
    <id>10000001</id>
    <account>ACC-A</account>
    <asset_type>Equity</asset_type>
    <booking_system>SystemX</booking_system>
    <affirmation_system>AffirmY</affirmation_system>
    <clearing_house>ClearZ</clearing_house>
    <create_time>2025-01-01T10:00:00</create_time>
    <update_time>2025-08-01T10:00:00</update_time>
    <status>OPEN</status>
  </trade>
  <trade>
    <id>10000002</id>
    <account>ACC-B</account>
    <asset_type>Bond</asset_type>
    <booking_system>SystemX</booking_system>
    <affirmation_system>AffirmY</affirmation_system>
    <clearing_house>ClearZ</clearing_house>
    <create_time>2025-01-02T10:00:00</create_time>
    <update_time>2025-08-02T10:00:00</update_time>
    <status>CLEARED</status>
  </trade>
</root>
`;

const RAW_PARSED_FIELDS = [
  { "id": [{ "#text": "10000001" }] },
  { "account": [{ "#text": "ACC-A" }] },
  { "asset_type": [{ "#text": "Equity" }] },
  { "booking_system": [{ "#text": "SystemX" }] },
  { "affirmation_system": [{ "#text": "AffirmY" }] },
  { "clearing_house": [{ "#text": "ClearZ" }] },
  { "create_time": [{ "#text": "2025-01-01T10:00:00" }] },
  { "update_time": [{ "#text": "2025-08-01T10:00:00" }] },
  { "status": [{ "#text": "OPEN" }] }
];

describe('Ingestor Service Unit Tests', () => {

  beforeEach(() => {
    sqsMock.reset();
    s3Mock.reset();
    ssmMock.reset();
    process.env.NODE_ENV = 'test';
    process.env.QUEUE_URL = 'https://sqs.test.com'; 
    config.queueUrl = 'https://sqs.test.com';
  });

  // 1. cleanUpFields Test
  test('cleanUpFields should transform XML to JSON', () => {
    const result = cleanUpFields(RAW_PARSED_FIELDS);

    expect(result).toEqual({
      id: "10000001", 
        account: "ACC-A",
        asset_type: "Equity",
        booking_system: "SystemX",
        affirmation_system: "AffirmY",
        clearing_house: "ClearZ",
        create_time: "2025-01-01T10:00:00",
        update_time: "2025-08-01T10:00:00",
        status: "OPEN"
    })
  })

  // fetchS3File Test
  test('fetchS3File should retrieve and stringify body', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => SAMPLE_XML_BODY
      }
    })

    const data = await fetchS3File('test-bucket', 'test.xml');
    expect(data).toBe(SAMPLE_XML_BODY);
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'test-bucket',
      Key: 'test.xml'
    })
  })

  // getLastPosition SSM Test
  test('getLastPosition should return integer when param exists', async () => {
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: { Value: "15" }
    })

    const pos = await getLastPosition('test-param');
    expect(pos).toBe(15);
  })

  test('getLastPosition should return 0 when param not found', async () => {
    const error = new Error('Not Found');
    error.name = 'ParameterNotFound';
    ssmMock.on(GetParameterCommand).rejects(error);

    const pos = await getLastPosition('test-param');
    expect(pos).toBe(0);
  });

  test('saveLastPosition should put parameter', async () => {
    ssmMock.on(PutParameterCommand).resolves({});

    await saveLastPosition('test-param', 20);
    
    expect(ssmMock).toHaveReceivedCommandWith(PutParameterCommand, {
      Name: 'test-param',
      Value: "20",
      Overwrite: true
    });
  });

  test('processBatch should send SQS messages and update SSM', async () => {
    ssmMock.on(PutParameterCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({ MessageId: '123' });

    // 3. UPDATED MOCK ENTRIES
    // Includes one TRADE (uses 'id') and one TRANSACTION (uses 'trade_id')
    const mockEntries = [
      { 
        trade: [
          { id: [{ '#text': "10000001" }] },
          { account: [{ '#text': "ACC-A" }] },
          { asset_type: [{ '#text': "Equity" }] },
          { booking_system: [{ '#text': "SystemX" }] },
          { affirmation_system: [{ '#text': "AffirmY" }] },
          { clearing_house: [{ '#text': "ClearZ" }] },
          { create_time: [{ '#text': "2025-01-01T10:00:00" }] },
          { update_time: [{ '#text': "2025-08-01T10:00:00" }] },
          { status: [{ '#text': "OPEN" }] }
        ] 
      },
      { 
        transaction: [
          { id: [{ '#text': "50000001" }] },
          { trade_id: [{ '#text': "10000001" }] },
        ] 
      }
    ];

    const nextPos = await processBatch(mockEntries, 0);

    // Assert SQS sent 2 messages
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 2);
    
    // CHECK 1: TRADE MESSAGE
    expect(sqsMock).toHaveReceivedNthCommandWith(1, SendMessageCommand, {
        MessageGroupId: "10000001", 
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: expect.stringContaining('"asset_type":"Equity"')
    });

    // CHECK 2: TRANSACTION MESSAGE
    expect(sqsMock).toHaveReceivedNthCommandWith(2, SendMessageCommand,{
        MessageGroupId: "10000001", 
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: expect.stringContaining('"id":"50000001"')
    });

    // Assert SSM updated to position 2
    expect(ssmMock).toHaveReceivedCommandWith(PutParameterCommand, {
      Value: "2"
    });
    
    expect(nextPos).toBe(2);
  });
})


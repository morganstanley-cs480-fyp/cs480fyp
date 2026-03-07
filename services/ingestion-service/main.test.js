import request from 'supertest';
import { mockClient } from "aws-sdk-client-mock";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand, PutParameterCommand } from "@aws-sdk/client-ssm";
import 'aws-sdk-client-mock-jest';

import {
  fetchS3File,
  getLastPosition,
  saveLastPosition,
  cleanUpFields,
  parseXML,
  sendToSQS,
  config,
  app 
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

  test('parseXML should correctly parse XML string into structured array', () => {
    const parsed = parseXML(SAMPLE_XML_BODY);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(parsed[0].trade).toBeDefined();
    expect(parsed[1].trade).toBeDefined();
    expect(parsed[0].trade[0].id[0]['#text']).toBe(10000001);
  });

  test('sendToSQS should clean up fields and dispatch to SQS', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'sim-123' });

    const mockEntry = { 
      trade: [
        { id: [{ '#text': "99999999" }] },
        { account: [{ '#text': "SIM-ACC" }] }
      ] 
    };

    await sendToSQS(mockEntry);

    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
      QueueUrl: config.queueUrl,
      MessageGroupId: "99999999",
      MessageBody: expect.stringContaining('"account":"SIM-ACC"'),
      MessageDeduplicationId: expect.any(String)
    });
  });

  // --- ORIGINAL TESTS ---

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
    });
  });

  test('fetchS3File should retrieve and stringify body', async () => {
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => SAMPLE_XML_BODY
      }
    });

    const data = await fetchS3File('test-bucket', 'test.xml');
    expect(data).toBe(SAMPLE_XML_BODY);
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: 'test-bucket',
      Key: 'test.xml'
    });
  });

  test('getLastPosition should return integer when param exists', async () => {
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: { Value: "15" }
    });

    const pos = await getLastPosition('test-param');
    expect(pos).toBe(15);
  });

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

  // --- EXPRESS API TESTS ---
  test('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
  });

  test('POST /api/simulate should parse XML and send to SQS', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'sim-api-123' });

    const xmlPayload = `
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
    </root>`;

    const response = await request(app)
      .post('/api/simulate')
      .set('Content-Type', 'application/xml')
      .send(xmlPayload);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.message).toContain('Simulation successful');

    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
    expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
      QueueUrl: config.queueUrl,
      MessageGroupId: "10000001",
      MessageBody: expect.stringContaining('"account":"ACC-A"'),
      MessageDeduplicationId: expect.any(String)
    });
  });

  test('POST /api/simulate should return 400 for empty payload', async () => {
    const response = await request(app)
      .post('/api/simulate')
      .set('Content-Type', 'application/xml')
      .send(''); 

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Empty XML payload");
  });
});
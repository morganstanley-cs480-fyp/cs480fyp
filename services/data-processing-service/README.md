This is a service that 

1. Reads from SQS from ingestion service and adds the recieved data into postgresSQL database
2. Publish to Elasticache to gateway service to update websocket
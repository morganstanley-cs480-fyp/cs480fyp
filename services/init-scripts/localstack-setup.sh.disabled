#!/bin/sh
echo "Setting up localstack services"

awslocal s3api create-bucket --bucket testbucket --region ap-southeast-1 --create-bucket-configuration LocationConstraint=ap-southeast-1

awslocal s3 cp /data/data.xml s3://testbucket/data.xml

awslocal ssm put-parameter \
    --name "/trade-ingestor/last-pos" \
    --value "0" \
    --type String \

awslocal sqs create-queue   --queue-name my-queue.fifo   --attributes FifoQueue=true,ContentBasedDeduplication=false

touch /var/lib/localstack/.setup-complete


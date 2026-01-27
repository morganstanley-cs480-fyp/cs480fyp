variable "service_name" {
  description = "Name of the service (e.g., ingestion-service)"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket containing XML data"
  type        = string
}

variable "ssm_parameter_arn" {
  description = "ARN of the SSM parameter used for bookmarking"
  type        = string
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue to send data to"
  type        = string
}
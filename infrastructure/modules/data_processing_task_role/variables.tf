variable "service_name" {
  description = "Name of the service (used for naming roles)"
  type        = string
}

variable "sqs_queue_arn" {
  description = "The ARN of the SQS queue to consume from"
  type        = string
}
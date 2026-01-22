variable "role_name" {
  description = "The name of the IAM role"
  type        = string
}

variable "sqs_arns" {
  description = "List of ARNs for SQS queues"
  type        = list(string)
}

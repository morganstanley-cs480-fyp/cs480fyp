variable "sqs_name" {
  description = "The of the sqs"
  type        = string
}

variable "is_fifo" {
  description = "Boolean to determine if this is a FIFO queue. If true, .fifo will be appended to the name automatically."
  type        = bool
  default     = false # Default to Standard queue
}

variable "content_based_deduplication" {
  description = "Enable content-based deduplication for FIFO queues."
  type        = bool
  default     = false
}

# Timeout for the Lambda function
variable "visibility_timeout_seconds" {
  description = "Visibility of timeout of message in sqs for lambda function"
  type        = number
}

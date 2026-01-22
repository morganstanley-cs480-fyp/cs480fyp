variable "sqs_name" {
  description = "The of the sqs"
  type        = string
}

# Timeout for the Lambda function
variable "visibility_timeout_seconds" {
  description = "Visibility of timeout of message in sqs for lambda function"
  type        = number
}

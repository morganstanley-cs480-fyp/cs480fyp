resource "aws_sqs_queue" "this" {
  name = var.sqs_name
  visibility_timeout_seconds = var.visibility_timeout_seconds
}
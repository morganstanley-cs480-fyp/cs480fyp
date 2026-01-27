resource "aws_sqs_queue" "this" {
  name                        = var.sqs_name # MUST end in .fifo
  visibility_timeout_seconds  = var.visibility_timeout_seconds
  fifo_queue                  = var.is_fifo
  content_based_deduplication = var.is_fifo ? var.content_based_deduplication : false
}
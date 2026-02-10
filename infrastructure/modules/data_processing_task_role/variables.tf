variable "service_name" {
  description = "Name of the service (used for naming roles)"
  type        = string
}

variable "data_processing_queue_arn" {
  description = "The ARN of the data_proccessing queue to consume from"
  type        = string
}

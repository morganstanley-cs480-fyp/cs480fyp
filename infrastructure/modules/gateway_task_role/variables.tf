variable "service_name" {
  description = "Name of the service (used for naming roles)"
  type        = string
}

variable "update_gateway_queue_arn" {
  description = "The ARN of the update_gateway queue to send to"
  type        = string
}


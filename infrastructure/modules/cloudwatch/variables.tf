variable "log_group_name" {
  description = "The name of the CloudWatch log group"
  type        = string
}

variable "retention_in_days" {
  description = "The number of days to retain log events"
  type        = number
  default     = 14  # Default retention period (optional)
}

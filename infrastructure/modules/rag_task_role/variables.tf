variable "service_name" {
  description = "Name of the service (used for naming the role)"
  type        = string
  default     = "rag-service"
}

variable "region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}
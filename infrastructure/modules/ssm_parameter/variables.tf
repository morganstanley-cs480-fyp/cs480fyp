variable "parameter_name" {
  type = string
}

variable "initial_value" {
  type = string
}

variable "description" {
  type    = string
  default = "Managed by Terraform"
}

variable "type" {
  description = "SSM parameter type: String, StringList, or SecureString"
  type        = string
  default     = "String"
}
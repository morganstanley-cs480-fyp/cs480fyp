variable "role_name" {
  description = "The name of the IAM role for ECS task execution"
  type        = string
}

variable "policy_arn" {
  description = "The ARN of the policy to attach to the IAM role"
  type        = string
  default     = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

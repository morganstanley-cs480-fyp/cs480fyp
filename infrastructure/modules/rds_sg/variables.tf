variable "vpc_id" {
  description = "VPC ID where the security group will be created"
  type        = string
}

variable "ecs_security_group_ids" {
  description = "List of ECS security group IDs that will have access to the RDS"
  type        = list(string)
}
variable "family" {
  description = "The family of the task definition"
  type        = string
}

variable "container_name" {
  description = "The container name of the image"
  type        = string
}

variable "container_image" {
  description = "The image used to start the container"
  type        = string
}

variable "container_port" {
  description = "The port on which the container will accept traffic"
  type        = number
}

variable "log_group" {
  description = "The name of the CloudWatch log group"
  type        = string
}

variable "execution_role_arn" {
  description = "The ARN of the task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "The ARN of the task execution role"
  type        = string
}

variable "service_name" {
  description = "The name of the ECS service"
  type        = string
}

variable "cluster_id" {
  description = "The ECS cluster to deploy the service into"
  type        = string
}

variable "desired_count" {
  description = "The desired number of task instances"
  type        = number
  default     = 1
}

variable "subnets" {
  description = "List of subnet IDs for the ECS service"
  type        = list(string)
}

variable "security_groups" {
  description = "List of security group IDs for the ECS service"
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Whether to assign a public IP address to the task"
  type        = bool
  default     = false
}

variable "target_group_arn" {
  description = "ARN of the Target Group. Leave empty for background workers."
  type        = string
  default     = null
}

variable "region" {
  description = "The AWS region"
  type        = string
}

variable "rds_environment" {
  type = list(object({
    name  = string
    value = string
  }))
}

variable "sqs_environment" {
  type = list(object({
    name  = string
    value = string
  }))
}

variable "other_environment" {
  type = list(object({
    name  = string
    value = string
  }))
}



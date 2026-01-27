variable "vpc_id" {
  type        = string
  description = "The VPC ID where the ECS service security group will be created"
}

variable "alb_sg_id" {
  type        = string
  description = "The security group ID of the ALB to allow traffic from"
}

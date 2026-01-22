variable "alb_sg_name" {
  description = "Name of the ALB security group"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ALB is created"
  type        = string
}

variable "ingress_cidr_blocks" {
  description = "List of CIDR blocks for ALB ingress"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Allow all inbound traffic (can be customized)
}

variable "lb_name" {
  description = "Name of the Application Load Balancer"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ALB"
  type        = list(string)
}

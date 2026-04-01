variable "vpc_id" {
  description = "The ID of the VPC where Neo4j will be deployed"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the PUBLIC subnet for the EC2 instance"
  type        = string
}

variable "vpc_cidr_block" {
  description = "The IPv4 CIDR block of the VPC (e.g., 10.0.0.0/16)"
  type        = string
}

variable "my_ip" {
  description = "Your personal public IP address (e.g., 203.0.113.50/32) for UI access"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}
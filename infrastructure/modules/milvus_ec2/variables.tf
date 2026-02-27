variable "vpc_id" {
  description = "The ID of the VPC where Milvus will be deployed"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the public subnet for the EC2 instance"
  type        = string
}

variable "vpc_cidr_block" {
  description = "The CIDR block of the VPC to allow internal ECS traffic"
  type        = string
}

variable "public_key_path" {
  description = "Local path to the SSH public key for EC2 access"
  type        = string
  default     = "~/.ssh/milvus_ec2_key.pub"
}
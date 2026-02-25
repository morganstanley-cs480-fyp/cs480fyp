variable "vpc_id" { 
  description = "The VPC where the ec2 is in"
  type = string 
}

variable "subnet_id" { 
  description = "The subnets the ec2 is in"
  type = string 
}

variable "vpc_cidr_block" { 
  description = "vpc"
  type = string 
}

variable "public_key_path" { 
  description = "The local path to the public SSH key"
  type        = string 
  default     = "~/.ssh/milvus_ec2_key.pub"
}
# modules/vpc/variables.tf

variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnet1_cidr" {
  description = "CIDR block for the first public subnet"
  type        = string
}

variable "public_subnet2_cidr" {
  description = "CIDR block for the second public subnet"
  type        = string
}

variable "availability_zone1" {
  description = "First availability zone"
  type        = string
}

variable "availability_zone2" {
  description = "Second availability zone"
  type        = string
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "environment" {
  description = "Environment (staging or production)"
  type        = string
}

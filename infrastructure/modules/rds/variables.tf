variable "db_identifier" {
  description = "Unique identifier for the DB instance"
  type        = string
}


variable "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  type        = string
}

variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs"
  type        = list(string)
}


variable "db_username" {
  description = "Master username for the database"
  type        = string
}

variable "db_password" {
  description = "Master password for the database"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

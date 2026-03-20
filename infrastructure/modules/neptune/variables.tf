variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "ecs_sg_id" {
  description = "The Security Group ID of the ECS Service to allow access"
  type        = string
}

variable "cluster_identifier" {
  default = "knowledge-graph-cluster"
}
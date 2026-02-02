variable "cluster_id" {}
variable "vpc_id" {}
variable "subnet_ids" { type = list(string) }
variable "ecs_sg_id" {}
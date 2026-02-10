provider "aws" {
  region = var.region
}

# VPC, Subnets, Internet Gateway, Route Tables
module "networking" {
  source              = "./modules/networking"
  vpc_cidr_block      = var.vpc_cidr_block
  public_subnet1_cidr = var.public_subnet1_cidr
  public_subnet2_cidr = var.public_subnet2_cidr
  availability_zone1  = var.availability_zone1
  availability_zone2  = var.availability_zone2
  vpc_name            = var.vpc_name
  environment         = var.environment
}

# ALB, ALB http_listener, ALB-SG
module "alb" {
  source      = "./modules/alb"
  alb_sg_name = var.alb_sg_name
  vpc_id      = module.networking.vpc_id
  lb_name     = var.lb_name
  subnet_ids  = module.networking.public_subnet_ids
}

# S3 for FRONT END
module "frontend_s3" {
  source          = "./modules/s3_client"
  bucket_name     = var.s3_frontend_bucket_name
  allowed_origins = ["*"]
}

# S3 for XML File
module "s3_data" {
  source      = "./modules/s3_data"
  bucket_name = var.s3_data_bucket_name
}

# SSM Parameter Store
module "xml_pointer" {
  source         = "./modules/ssm_parameter"
  parameter_name = "/simulator/last_index"
  description    = "Current index pointer for XML simulation"
  initial_value  = "0"
}

# Data Processing SQS (Ingestion service TO Data Processing Service)
module "data_processing_queue" {
  source                     = "./modules/sqs"
  sqs_name                   = var.data_processing_queue_name # Needs to end with .fifo
  is_fifo                    = true
  visibility_timeout_seconds = 240

}

# RDS-SG
module "rds_security_group" {
  source                 = "./modules/rds_sg"
  vpc_id                 = module.networking.vpc_id
  ecs_security_group_ids = [module.ecs_security_group.ecs_service_sg_id]
}

# RDS subnet group
module "rds_subnet_group" {
  source     = "./modules/rds_subnet"
  name       = var.rds_subnet_name
  subnet_ids = module.networking.public_subnet_ids
}

module "main_rds" {
  source                 = "./modules/rds"
  db_identifier          = var.main_db_identifier
  db_subnet_group_name   = module.rds_subnet_group.name
  vpc_security_group_ids = [module.rds_security_group.rds_sg_id, module.ecs_security_group.ecs_service_sg_id]
  db_username            = var.db_username
  db_password            = var.db_password
  db_name                = "main_db"
}

# ECS-SG
module "ecs_security_group" {
  source    = "./modules/ecs_sg"
  vpc_id    = module.networking.vpc_id
  alb_sg_id = module.alb.alb_sg_id
}

# ECS IAM (Noraml Front facing ECS)
module "ecs_execution_role" {
  source    = "./modules/ecs_execution_role"
  role_name = var.execution_role_name
}

# ECS cluster
module "ecs_cluster" {
  source       = "./modules/ecs_cluster"
  cluster_name = var.ecs_cluster_name
}

# DATA PROCESSING SERVICE (To add elasticache pub sub)
# # Data Processing ECR
# module "data_processing_service_ecr" {
#   source          = "./modules/ecr"
#   repository_name = var.data_processing_repo_name
# }

# data_processing_task_role
module "data_processing_task_role" {
  source        = "./modules/data_processing_task_role"
  service_name  = var.data_processing_service_name
  sqs_queue_arn = module.data_processing_queue.sqs_queue_arn
}

# data_processing_cloudwatch
module "data_processing_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.data_processing_log_group_name
  retention_in_days = 14
}

# data_processing_ecs
# module "data_processing_service" {
#   source                  = "./modules/ecs"
#   family                  = var.data_processing_family
#   container_name          = var.data_processing_container_name
#   container_image         = var.data_processing_container_image
#   container_port          = 0
#   log_group               = module.data_processing_log_group.log_group_name
#   region                  = var.region
#   execution_role_arn      = module.ecs_execution_role.role_arn
#   task_role_arn           = module.data_processing_task_role.role_arn
#   service_name            = var.data_processing_service_name
#   cluster_id              = module.ecs_cluster.cluster_id
#   desired_count           = 1
#   subnets                 = module.networking.public_subnet_ids
#   security_groups         = [module.ecs_security_group.ecs_service_sg_id]
#   assign_public_ip        = true
#   rds_environment = [
#     { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
#     { name = "DB_USER", value = var.db_username },
#     { name = "DB_PASSWORD", value = var.db_password },
#     { name = "DB_NAME", value = module.main_rds.db_name }
#   ]
#   sqs_environment = [
#     { name = "DATA_PROCESSING_QUEUE_URL", value = module.data_processing_queue.sqs_queue_url },
#   ]
#   other_environment = [
#     {name = "MIGRATE", value = "true"}
#   ]
# }

# EXCEPTION SERVICE (Change Port Group)
# # Exception ECR
# module "exception_service_ecr" {
#   source          = "./modules/ecr"
#   repository_name = var.exception_repo_name
# }

# exception_target_group 
module "exception_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.exception_target_group_name
  target_group_port     = 3001
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# exception_service_rule
module "exception_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 101
  path_pattern     = ["/exception*"]
  target_group_arn = module.exception_target_group.target_group_arn
}

# exception_cloudwatch
module "exception_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.exception_log_group_name
  retention_in_days = 14
}

# exception_ecs
module "exception_service" {
  source             = "./modules/ecs"
  family             = var.exception_family
  container_name     = var.exception_container_name
  container_image    = var.exception_container_image
  container_port     = 3001
  log_group          = module.exception_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = ""
  service_name       = var.exception_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.exception_target_group.target_group_arn
  rds_environment = [
    { name = "DATABASE_URL", value = "postgres://${var.db_username}:${var.db_password}@${split(":", module.main_rds.db_endpoint)[0]}:5432/${module.main_rds.db_name}" }
  ]
  sqs_environment = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# GATEWAY SERVICE (To Add elasticache access for pub sub)
# # Gateway ECR
# module "gateway_service_ecr" {
#   source          = "./modules/ecr"
#   repository_name = var.gateway_repo_name
# }

# gateway_target_group
module "gateway_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.gateway_target_group_name
  target_group_port     = 3002
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# gateway_service_rule
module "gateway_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 102
  path_pattern     = ["/gateway*"]
  target_group_arn = module.gateway_target_group.target_group_arn
}

# gateway_cloudwatch
module "gateway_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = "/ecs/gateway-logs"
  retention_in_days = 14
}

# gateway_ecs
module "gateway_service" {
  source             = "./modules/ecs"
  family             = var.gateway_family
  container_name     = var.gateway_container_name
  container_image    = var.gateway_container_image
  container_port     = 3002
  log_group          = module.gateway_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = "" # To Edit
  service_name       = var.gateway_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.gateway_target_group.target_group_arn
  rds_environment    = []
  sqs_environment    = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# INGESTION SERVICE
# # Ingestion ECR
# module "ingestion_service_ecr" {
#   source          = "./modules/ecr"  # Adjust the path as necessary
#   repository_name = var.ingestion_repo_name
# }

# ingestion task role (iam permissions)
# Create the specific IAM Role for Ingestion
module "ingestion_task_role" {
  source            = "./modules/ingestion_task_role"
  service_name      = "ingestion-service"
  s3_bucket_arn     = module.s3_data.bucket_arn
  ssm_parameter_arn = module.xml_pointer.arn
  sqs_queue_arn     = module.data_processing_queue.sqs_queue_arn
}

# ingestion cloudwatch
module "ingestion_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.ingestion_log_group_name
  retention_in_days = 14
}

# ingestion ecs
module "ingestion_service" {
  source             = "./modules/ecs"
  family             = var.ingestion_family
  container_name     = var.ingestion_container_name
  container_image    = var.ingestion_container_image
  container_port     = 0
  log_group          = module.ingestion_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = module.ingestion_task_role.role_arn
  service_name       = var.ingestion_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  rds_environment    = []
  sqs_environment = [
    { name = "DATA_PROCESSING_QUEUE_URL", value = module.data_processing_queue.sqs_queue_url },
  ]
  other_environment = [
    { name = "MIGRATE", value = "true" }
  ]
}


# QUERY SUGGESTION SERVICE
# # Query Suggestion ECR
# module "query_suggestion_service_ecr" {
#   source          = "./modules/ecr"
#   repository_name = var.query_suggestion_repo_name
# }

# query_suggestion_target_group
module "query_suggestion_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.query_suggestion_target_group_name
  target_group_port     = 3003
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# query_suggestion_service_rule
module "query_suggestion_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 103
  path_pattern     = ["/query_suggestion*"]
  target_group_arn = module.query_suggestion_target_group.target_group_arn
}

# query_suggestion_cloudwatch
module "query_suggestion_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.query_suggestion_log_group_name
  retention_in_days = 14
}

# query_suggestion_ecs
module "query_suggestion_service" {
  source             = "./modules/ecs"
  family             = var.query_suggestion_family
  container_name     = var.query_suggestion_container_name
  container_image    = var.query_suggestion_container_image
  container_port     = 3003
  log_group          = module.query_suggestion_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = ""
  service_name       = var.query_suggestion_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.query_suggestion_target_group.target_group_arn
  rds_environment    = []
  sqs_environment    = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# RAG SERVICE
# # RAG ECR
# module "rag_service_ecr" {
#   source          = "./modules/ecr" 
#   repository_name = var.rag_repo_name
# }

# rag_target_group
module "rag_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.rag_target_group_name
  target_group_port     = 3004
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# RAG_service_rule
module "rag_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 104
  path_pattern     = ["/rag*"]
  target_group_arn = module.rag_target_group.target_group_arn
}

# rag_cloudwatch
module "rag_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.rag_log_group_name
  retention_in_days = 14
}

# rag_ecs
module "rag_service" {
  source             = "./modules/ecs"
  family             = var.rag_family
  container_name     = var.rag_container_name
  container_image    = var.rag_container_image
  container_port     = 3004
  log_group          = module.rag_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = ""
  service_name       = var.rag_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.rag_target_group.target_group_arn
  rds_environment = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name }
  ]
  sqs_environment = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# SEARCH SERVICE
# # Search ECR
# module "search_service_ecr" {
#   source          = "./modules/ecr" 
#   repository_name = var.search_repo_name
# }

# search_target_group
module "search_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.search_target_group_name
  target_group_port     = 3005
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# search_service_rule
module "search_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 105
  path_pattern     = ["/search*"]
  target_group_arn = module.search_target_group.target_group_arn
}

# search_cloudwatch
module "search_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.search_log_group_name
  retention_in_days = 14
}

# search_ecs
module "search_service" {
  source             = "./modules/ecs"
  family             = var.search_family
  container_name     = var.search_container_name
  container_image    = var.search_container_image
  container_port     = 3005
  log_group          = module.search_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = ""
  service_name       = var.search_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.search_target_group.target_group_arn
  rds_environment = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name }
  ]
  sqs_environment = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# SOLUTION SERVICE
# # Solution ECR
# module "solution_service_ecr" {
#   source          = "./modules/ecr" 
#   repository_name = var.solution_repo_name
# }

# solution_target_group
module "solution_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.solution_target_group_name
  target_group_port     = 3006
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# solution_service_rule
module "solution_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 106
  path_pattern     = ["/solution*"]
  target_group_arn = module.solution_target_group.target_group_arn
}

# solution_cloudwatch
module "solution_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.solution_log_group_name
  retention_in_days = 14
}

# solution_ecs
module "solution_service" {
  source             = "./modules/ecs"
  family             = var.solution_family
  container_name     = var.solution_container_name
  container_image    = var.solution_container_image
  container_port     = 3006
  log_group          = module.solution_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = ""
  service_name       = var.solution_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.solution_target_group.target_group_arn
  rds_environment = [
    { name = "DATABASE_URL", value = "postgres://${var.db_username}:${var.db_password}@${split(":", module.main_rds.db_endpoint)[0]}:5432/${module.main_rds.db_name}" }
  ]
  sqs_environment = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# TRADE FLOW SERVICE # To change target port
# # Trade Flow ECR
# module "trade_flow_service_ecr" {
#   source          = "./modules/ecr" 
#   repository_name = var.trade_flow_repo_name
# }

# trade_flow target to ALB
module "trade_flow_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.trade_flow_target_group_name
  target_group_port     = 3007
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# trade_flow target role
module "trade_flow_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 107
  path_pattern     = ["/trade_flow*"]
  target_group_arn = module.trade_flow_target_group.target_group_arn
}

# trade_flow_cloudwatch
module "trade_flow_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.trade_flow_log_group_name
  retention_in_days = 14
}

# trade_flow_ecs
module "trade_flow_service" {
  source             = "./modules/ecs"
  family             = var.trade_flow_family
  container_name     = var.trade_flow_container_name
  container_image    = var.trade_flow_container_image
  container_port     = 3007
  log_group          = module.trade_flow_log_group.log_group_name
  region             = var.region
  execution_role_arn = module.ecs_execution_role.role_arn
  task_role_arn      = ""
  service_name       = var.trade_flow_service_name
  cluster_id         = module.ecs_cluster.cluster_id
  desired_count      = 1
  subnets            = module.networking.public_subnet_ids
  security_groups    = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip   = true
  target_group_arn   = module.trade_flow_target_group.target_group_arn
  rds_environment = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name }
  ]
  sqs_environment = []
  other_environment = [
    { name = "ALB_URL", value = "http://${module.alb.alb_dns_name}" }
  ]
}

# MILVUS EC2 INSTANCE
module "milvus_ec2" {
  source = "./modules/milvus_ec2"

  project_name          = "cs480fyp"
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  subnet_id             = module.networking.public_subnet_ids[0]
  ecs_security_group_id = module.ecs_security_group.ecs_service_sg_id

  instance_type    = "t3.large"
  volume_size      = 30
  data_volume_size = 100
  key_name         = var.key_name
  ssh_cidr_blocks  = ["0.0.0.0/0"] # Restrict this in production
}
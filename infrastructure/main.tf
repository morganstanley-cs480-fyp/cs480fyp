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

# Look for existing front_end S3 bucket
data "aws_s3_bucket" "existing_frontend" {
  bucket = "morgan-stanley-frontend"
}

# S3 for XML File
module "s3_data" {
  source           = "./modules/s3_data"
  bucket_name      = var.s3_data_bucket_name
  file_key         = var.s3_data_file_key 
}

# SSM Parameter Store
module "xml_pointer" {
  source         = "./modules/ssm_parameter"
  parameter_name = "/simulator/last_index"
  description    = "Current index pointer for XML simulation"
  initial_value  = "0"
}

# Pre-existing SSM SecureString — managed manually in AWS Console, not by Terraform
data "aws_ssm_parameter" "google_api_key" {
  name = "/ecs/secrets/google_api_key"
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

module "redis_cache" {
  source     = "./modules/elasticache"
  cluster_id = "main-redis-cache"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.public_subnet_ids
  ecs_sg_id  = module.ecs_security_group.ecs_service_sg_id
}

module "milvus_db" {
  source          = "./modules/milvus_ec2"
  vpc_id          = module.networking.vpc_id
  subnet_id       = module.networking.public_subnet_ids[0]
  vpc_cidr_block  = var.vpc_cidr_block 
  public_key_path = "~/.ssh/milvus_ec2_key.pub" 
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
# data_processing_task_role
module "data_processing_task_role" {
  source        = "./modules/data_processing_task_role"
  service_name  = var.data_processing_service_name
  data_processing_queue_arn = module.data_processing_queue.sqs_queue_arn
}

# data_processing_cloudwatch
module "data_processing_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.data_processing_log_group_name
  retention_in_days = 14
}

# data_processing_ecs
module "data_processing_service" {
  source                  = "./modules/ecs"
  family                  = var.data_processing_family
  container_name          = var.data_processing_container_name
  container_image         = var.data_processing_container_image
  container_port          = 0
  log_group               = module.data_processing_log_group.log_group_name
  region                  = var.region
  execution_role_arn      = module.ecs_execution_role.role_arn
  task_role_arn           = module.data_processing_task_role.role_arn
  service_name            = var.data_processing_service_name
  cluster_id              = module.ecs_cluster.cluster_id
  desired_count           = 1
  subnets                 = module.networking.public_subnet_ids
  security_groups         = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip        = true
  environments = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name },
    { name = "DATA_PROCESSING_QUEUE_URL", value = module.data_processing_queue.sqs_queue_url },
    { name  = "REDIS_HOST", value = module.redis_cache.primary_endpoint_address }
  ]
  secrets =[]
}

# EXCEPTION SERVICE (Change Port Group)
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
  path_pattern     = ["/api/exceptions*"]
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
  environments = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name },
    { name = "DATABASE_URL", value = "postgres://${var.db_username}:${var.db_password}@${split(":", module.main_rds.db_endpoint)[0]}:5432/${module.main_rds.db_name}" }
  ]
  secrets = []
}

# GATEWAY SERVICE
# gateway target to ALB
module "gateway_target_group" {
  source                = "./modules/alb_tg"
  target_group_name     = var.gateway_target_group_name
  target_group_port     = 3002
  target_group_protocol = "HTTP"
  vpc_id                = module.networking.vpc_id
}

# gateway listener rule
module "gateway_listener_rule" {
  source           = "./modules/alb_rule"
  listener_arn     = module.alb.http_listener_arn
  priority         = 102
  # FIX: You must specify which requests go to the gateway
  path_pattern     = ["/api/ws*"]
  target_group_arn = module.gateway_target_group.target_group_arn
}

# gateway_cloudwatch
module "gateway_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.gateway_log_group_name
  retention_in_days = 14
}

# gateway_ecs
module "gateway_service" {
  source                  = "./modules/ecs"
  family                  = var.gateway_family
  container_name          = var.gateway_container_name
  container_image         = var.gateway_container_image
  container_port          = 3002
  log_group               = module.gateway_log_group.log_group_name 
  region                  = var.region
  execution_role_arn      = module.ecs_execution_role.role_arn
  task_role_arn           = ""
  service_name            = var.gateway_service_name
  cluster_id              = module.ecs_cluster.cluster_id 
  desired_count           = 1
  subnets                 = module.networking.public_subnet_ids
  security_groups         = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip        = true
  target_group_arn        = module.gateway_target_group.target_group_arn
  environments = [
    { name  = "REDIS_HOST", value = module.redis_cache.primary_endpoint_address }
  ]
  secrets =[]
}

# INGESTION SERVICE
# ingestion task role (iam permissions)
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
  environments = [
    { name = "MIGRATE", value = "true"},
    { name = "S3_BUCKET_NAME", value = module.s3_data.bucket_name },
    { name = "S3_FILE_KEY",    value = module.s3_data.file_key },
    { name = "SSM_PARAM_NAME", value = module.xml_pointer.parameter_name },
    { name = "AWS_REGION", value = var.region },
    { name = "DATA_PROCESSING_QUEUE_URL", value = module.data_processing_queue.sqs_queue_url },
  ]
  secrets =[]
}

# RAG SERVICE
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
  path_pattern     = ["/api/rag*"]
  target_group_arn = module.rag_target_group.target_group_arn
}

# rag_cloudwatch
module "rag_log_group" {
  source            = "./modules/cloudwatch"
  log_group_name    = var.rag_log_group_name
  retention_in_days = 14
}

module "rag_task_role" {
  source       = "./modules/rag_task_role"
  service_name = "rag-service"
  region       = var.region
}

# rag_ecs
module "rag_service" {
  source                  = "./modules/ecs"
  family                  = var.rag_family
  container_name          = var.rag_container_name
  container_image         = var.rag_container_image
  container_port          = 3004
  log_group               = module.rag_log_group.log_group_name 
  region                  = var.region
  execution_role_arn      = module.ecs_execution_role.role_arn
  task_role_arn           = module.rag_task_role.role_arn
  service_name            = var.rag_service_name
  cluster_id              = module.ecs_cluster.cluster_id 
  desired_count           = 1
  subnets                 = module.networking.public_subnet_ids
  security_groups         = [module.ecs_security_group.ecs_service_sg_id]
  assign_public_ip        = true
  target_group_arn        = module.rag_target_group.target_group_arn 
  environments = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name },
    { name = "DATABASE_URL", value = "postgres://${var.db_username}:${var.db_password}@${split(":", module.main_rds.db_endpoint)[0]}:5432/${module.main_rds.db_name}" },
    { name = "MILVUS_HOST", value = module.milvus_db.milvus_private_ip },
    { name = "MILVUS_PORT", value = "19530" },
    { name = "MILVUS_COLLECTION", value = "document" },
    { name = "AWS_REGION", value = "ap-southeast-1" },
    { name = "BEDROCK_EMBED_MODEL_ID", value = "cohere.embed-english-v3" },
    { name = "BEDROCK_CHAT_MODEL_ID",  value = "us.amazon.nova-lite-v1:0" },
    { name = "GOOGLE_MODEL_ID",        value = "gemini-2.5-flash-lite" }
  ]
  secrets = [
    { name = "GOOGLE_API_KEY", valueFrom = data.aws_ssm_parameter.google_api_key.arn }
  ]
}

# SEARCH SERVICE
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
  path_pattern     = ["/api/search*", "/api/history*", "/api/filter-options*"]
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
  environments = [
    { name = "RDS_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "RDS_USER", value = var.db_username },
    { name = "RDS_PASSWORD", value = var.db_password },
    { name = "RDS_DB", value = module.main_rds.db_name },
    { name = "DATABASE_URL", value = "postgres://${var.db_username}:${var.db_password}@${split(":", module.main_rds.db_endpoint)[0]}:5432/${module.main_rds.db_name}" },
    { name  = "REDIS_HOST", value = module.redis_cache.primary_endpoint_address },
    { name = "GOOGLE_MODEL_ID", value = "gemini-2.5-flash-lite" },
    { name = "CORS_ORIGINS", value = "[\"https://${module.cloudfront.distribution_domain_name}\",\"http://localhost:5173\",\"http://localhost:4173\",\"http://localhost:3000\"]" }
  ]
  secrets = [
    { name = "GOOGLE_API_KEY", valueFrom = data.aws_ssm_parameter.google_api_key.arn }
  ]
}

# SOLUTION SERVICE
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
  path_pattern     = ["/api/solutions*"]
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
  environments = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name },
    { name = "DATABASE_URL", value = "postgres://${var.db_username}:${var.db_password}@${split(":", module.main_rds.db_endpoint)[0]}:5432/${module.main_rds.db_name}" }
  ]
  secrets = []
}

# TRADE FLOW SERVICE # To change target port
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
  path_pattern     = ["/api/trades*", "/api/transactions*"]
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
  environments = [
    { name = "DB_HOST", value = split(":", module.main_rds.db_endpoint)[0] },
    { name = "DB_USER", value = var.db_username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_NAME", value = module.main_rds.db_name },
  ]
  secrets = []
}

# CloudFront Distribution (SPA routing + custom error pages for S3)
module "cloudfront" {
  source                      = "./modules/cloudfront"
  bucket_name                 = data.aws_s3_bucket.existing_frontend.id
  bucket_regional_domain_name = data.aws_s3_bucket.existing_frontend.bucket_regional_domain_name
  alb_dns_name                = module.alb.alb_dns_name
}
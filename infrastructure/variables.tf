# ==========================================
# General / Provider
# ==========================================
variable "region" {
  description = "AWS Region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name (e.g., staging, prod)"
  type        = string
  default     = "staging"
}

# ==========================================
# Networking
# ==========================================
variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "public_subnet1_cidr" {
  description = "CIDR for Public Subnet 1"
  type        = string
  default     = "10.1.1.0/24"
}

variable "public_subnet2_cidr" {
  description = "CIDR for Public Subnet 2"
  type        = string
  default     = "10.1.2.0/24"
}

variable "availability_zone1" {
  type    = string
  default = "ap-southeast-1a"
}

variable "availability_zone2" {
  type    = string
  default = "ap-southeast-1b"
}

variable "vpc_name" {
  type    = string
  default = "vpc"
}

# ==========================================
# Load Balancer
# ==========================================
variable "alb_sg_name" {
  type    = string
  default = "alb-security-group"
}

variable "lb_name" {
  type    = string
  default = "app-load-balancer"
}

# ==========================================
# Storage (S3 & DB)
# ==========================================
variable "s3_frontend_bucket_name" {
  type    = string
  default = "frontend-bucket"
}

variable "s3_data_bucket_name" {
  type    = string
  default = "data-bucket"
}

variable "data_processing_queue_name" {
  type    = string
  default = "data-processing-queue.fifo"
}

variable "main_db_identifier" {
  type    = string
  default = "main-postgres-rds-instance"
}

variable "db_username" {
  type    = string
  default = "dbadmin"
}

variable "db_password" {
  description = "Password for the RDS instance"
  type        = string
  default     = "password" # strictly for dev/staging
  sensitive   = true
}

variable "rds_subnet_name" {
  type    = string
  default = "rds-subnet-group"
}

# ==========================================
# ECS Cluster & General
# ==========================================
variable "ecs_cluster_name" {
  type    = string
  default = "ecs-cluster"
}

variable "execution_role_name" {
  type    = string
  default = "ecs-task-execution-role"
}

# ==========================================
# 1. Data Processing Service
# ==========================================
variable "data_processing_repo_name" {
  type    = string
  default = "data-processing-service"
}

variable "data_processing_target_group_name" {
  type    = string
  default = "data-processing-target-group"
}

variable "data_processing_log_group_name" {
  type    = string
  default = "/ecs/data-processing-logs"
}

variable "data_processing_family" {
  type    = string
  default = "data-processing-service-task"
}

variable "data_processing_container_name" {
  type    = string
  default = "data-processing-service-container"
}

variable "data_processing_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/data-processing-service:latest"
}

variable "data_processing_service_name" {
  type    = string
  default = "data-processing-service"
}

# ==========================================
# 2. Exception Service
# ==========================================
variable "exception_repo_name" {
  type    = string
  default = "exception-service"
}

variable "exception_target_group_name" {
  type    = string
  default = "exception-target-group"
}

variable "exception_log_group_name" {
  type    = string
  default = "/ecs/exception-logs"
}

variable "exception_family" {
  type    = string
  default = "exception-service-task"
}

variable "exception_container_name" {
  type    = string
  default = "exception-service-container"
}

variable "exception_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/exception-service:latest"
}

variable "exception_service_name" {
  type    = string
  default = "exception-service"
}

# ==========================================
# 3. Gateway Service
# ==========================================
variable "gateway_repo_name" {
  type    = string
  default = "gateway-service"
}

variable "gateway_target_group_name" {
  type    = string
  default = "gateway-target-group"
}

variable "gateway_log_group_name" {
  type    = string
  default = "/ecs/gateway-logs"
}

variable "gateway_family" {
  type    = string
  default = "gateway-service-task"
}

variable "gateway_container_name" {
  type    = string
  default = "gateway-service-container"
}

variable "gateway_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/gateway-service:latest"
}

variable "gateway_service_name" {
  type    = string
  default = "gateway-service"
}

# ==========================================
# 4. Ingestion Service
# ==========================================
variable "ingestion_repo_name" {
  type    = string
  default = "ingestion-service"
}

variable "ingestion_target_group_name" {
  type    = string
  default = "ingestion-target-group"
}

variable "ingestion_log_group_name" {
  type    = string
  default = "/ecs/ingestion-logs"
}

variable "ingestion_family" {
  type    = string
  default = "ingestion-service-task"
}

variable "ingestion_container_name" {
  type    = string
  default = "ingestion-service-container"
}

variable "ingestion_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/ingestion-service:latest"
}

variable "ingestion_service_name" {
  type    = string
  default = "ingestion-service"
}

# ==========================================
# 5. Query Suggestion Service (Hyphens -> Underscores)
# ==========================================
variable "query_suggestion_repo_name" {
  type    = string
  default = "query-suggestion-service"
}

variable "query_suggestion_target_group_name" {
  type    = string
  default = "query-suggestion-target-group"
}

variable "query_suggestion_log_group_name" {
  type    = string
  default = "/ecs/query-suggestion-logs"
}

variable "query_suggestion_family" {
  type    = string
  default = "query-suggestion-service-task"
}

variable "query_suggestion_container_name" {
  type    = string
  default = "query-suggestion-service-container"
}

variable "query_suggestion_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/query-suggestion-service:latest"
}

variable "query_suggestion_service_name" {
  type    = string
  default = "query-suggestion-service"
}

# ==========================================
# 6. RAG Service
# ==========================================
variable "rag_repo_name" {
  type    = string
  default = "rag-service"
}

variable "rag_target_group_name" {
  type    = string
  default = "rag-target-group"
}

variable "rag_log_group_name" {
  type    = string
  default = "/ecs/rag-logs"
}

variable "rag_family" {
  type    = string
  default = "rag-service-task"
}

variable "rag_container_name" {
  type    = string
  default = "rag-service-container"
}

variable "rag_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/rag-service:latest"
}

variable "rag_service_name" {
  type    = string
  default = "rag-service"
}

# ==========================================
# 7. Search Service
# ==========================================
variable "search_repo_name" {
  type    = string
  default = "search-service"
}

variable "search_target_group_name" {
  type    = string
  default = "search-target-group"
}

variable "search_log_group_name" {
  type    = string
  default = "/ecs/search-logs"
}

variable "search_family" {
  type    = string
  default = "search-service-task"
}

variable "search_container_name" {
  type    = string
  default = "search-service-container"
}

variable "search_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/search-service:latest"
}

variable "search_service_name" {
  type    = string
  default = "search-service"
}

# ==========================================
# 8. Solution Service
# ==========================================
variable "solution_repo_name" {
  type    = string
  default = "solution-service"
}

variable "solution_target_group_name" {
  type    = string
  default = "solution-target-group"
}

variable "solution_log_group_name" {
  type    = string
  default = "/ecs/solution-logs"
}

variable "solution_family" {
  type    = string
  default = "solution-service-task"
}

variable "solution_container_name" {
  type    = string
  default = "solution-service-container"
}

variable "solution_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/solution-service:latest"
}

variable "solution_service_name" {
  type    = string
  default = "solution-service"
}

# ==========================================
# 9. Trade Flow Service
# ==========================================
variable "trade_flow_repo_name" {
  type    = string
  default = "trade-flow-service"
}

variable "trade_flow_target_group_name" {
  type    = string
  default = "trade-flow-target-group"
}

variable "trade_flow_log_group_name" {
  type    = string
  default = "/ecs/trade-flow-logs"
}

variable "trade_flow_family" {
  type    = string
  default = "trade-flow-service-task"
}

variable "trade_flow_container_name" {
  type    = string
  default = "trade-flow-service-container"
}

variable "trade_flow_container_image" {
  type    = string
  default = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/trade-flow-service:latest"
}

variable "trade_flow_service_name" {
  type    = string
  default = "trade-flow-service"
}

# ==========================================
# Milvus EC2
# ==========================================
variable "key_name" {
  description = "EC2 Key Pair name for SSH access to Milvus instance (leave empty to disable)"
  type        = string
  default     = "" # Set your key pair name or leave empty
}
# ==========================================
# General / Provider
# ==========================================
region = "ap-southeast-1"
environment = "staging"

# ==========================================
# Networking
# ==========================================
vpc_cidr_block = "10.1.0.0/16"
public_subnet1_cidr = "10.1.1.0/24"
public_subnet2_cidr = "10.1.2.0/24"
availability_zone1 = "ap-southeast-1a"
availability_zone2 = "ap-southeast-1b"
vpc_name = "vpc"

# ==========================================
# Load Balancer
# ==========================================
alb_sg_name = "alb-security-group"
lb_name = "app-load-balancer"

# ==========================================
# Storage (S3 & DB)
# ==========================================
s3_frontend_bucket_name = "frontend-bucket"
s3_data_bucket_name = "data-bucket"
s3_data_file_key = "data.xml"
main_db_identifier = "main-postgres-rds-instance"
rds_subnet_name = "rds-subnet-group"
db_username = "dbadmin"
db_password = "dbpassword"

# ==========================================
# MESSAGE QUEUES
# ==========================================
data_processing_queue_name = "data-processing-queue.fifo" # This is a fifo queue, so end with .fifo

# ==========================================
# ECS Cluster & General
# ==========================================
ecs_cluster_name = "ecs-cluster"
execution_role_name = "ecs-task-execution-role"

# ==========================================
# ECS Services
# ==========================================
data_processing_log_group_name = "/ecs/data-processing-service-logs"
data_processing_family = "data-processing-service-task"
data_processing_container_name = "data-processing-service-container"
data_processing_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/data-processing-service:latest"
data_processing_service_name = "data-processing-service"

exception_target_group_name = "exception-service-target-group"
exception_log_group_name = "/ecs/exception-service-logs"
exception_family = "exception-service-task"
exception_container_name = "exception-service-container"
exception_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/exception-service:latest"
exception_service_name = "exception-service"

gateway_target_group_name = "gateway-service-target-group"
gateway_log_group_name = "/ecs/gateway-service-logs"
gateway_family = "gateway-service-task"
gateway_container_name = "gateway-service-container"
gateway_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/gateway-service:latest"
gateway_service_name = "gateway-service"

ingestion_log_group_name = "/ecs/ingestion-service-logs"
ingestion_family = "ingestion-service-task"
ingestion_container_name = "ingestion-service-container"
ingestion_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/ingestion-service:latest"
ingestion_service_name = "ingestion-service"

query_suggestion_target_group_name = "query-suggestion-target-group"
query_suggestion_log_group_name = "/ecs/query-suggestion-service-logs"
query_suggestion_family = "query-suggestion-service-task"
query_suggestion_container_name = "query-suggestion-service-container"
query_suggestion_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/query-suggestion-service:latest"
query_suggestion_service_name = "query-suggestion-service"

rag_target_group_name = "rag-service-target-group"
rag_log_group_name = "/ecs/rag-service-logs"
rag_family = "rag-service-task"
rag_container_name = "rag-service-container"
rag_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/rag-service:latest"
rag_service_name = "rag-service"

search_target_group_name = "search-service-target-group"
search_log_group_name = "/ecs/search-service-logs"
search_family = "search-task"
search_container_name = "search-service-container"
search_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/search-service:latest"
search_service_name = "search-service"

solution_target_group_name = "solution-service-target-group"
solution_log_group_name = "/ecs/solution-service-logs"
solution_family = "solution-task"
solution_container_name = "solution-service-container"
solution_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/solution-service:latest"
solution_service_name = "solution_service"

trade_flow_target_group_name = "trade-flow-service-target-group"
trade_flow_log_group_name = "/ecs/trade-flow-service-logs"
trade_flow_family = "trade-flow-service-task"
trade_flow_container_name = "trade-flow-service-container"
trade_flow_container_image = "795367301114.dkr.ecr.ap-southeast-1.amazonaws.com/trade-flow-service:latest"
trade_flow_service_name = "trade-flow-service"
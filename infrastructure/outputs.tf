# ==========================================
# Milvus Outputs
# ==========================================
output "milvus_instance_id" {
  description = "Milvus EC2 instance ID"
  value       = module.milvus_ec2.instance_id
}

output "milvus_private_ip" {
  description = "Private IP address of the Milvus instance"
  value       = module.milvus_ec2.private_ip
}

output "milvus_public_ip" {
  description = "Public IP address of the Milvus instance (Elastic IP)"
  value       = module.milvus_ec2.public_ip
}

output "milvus_endpoint" {
  description = "Milvus endpoint for connecting from ECS services"
  value       = module.milvus_ec2.milvus_endpoint
}

output "milvus_admin_endpoint" {
  description = "Milvus admin endpoint for monitoring"
  value       = module.milvus_ec2.milvus_admin_endpoint
}

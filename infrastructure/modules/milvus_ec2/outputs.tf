output "milvus_private_ip" {
  description = "The private IP for ECS containers to connect to"
  value       = aws_instance.milvus_db.private_ip
}

output "milvus_public_ip" {
  description = "The public IP for you to SSH into from your laptop"
  value       = aws_instance.milvus_db.public_ip
}

output "security_group_id" {
  description = "The ID of the Milvus security group"
  value       = aws_security_group.milvus_sg.id
}
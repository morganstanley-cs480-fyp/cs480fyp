# NEW: Output the public IP to your terminal when Terraform finishes
output "milvus_public_ip" {
  value       = aws_instance.milvus_db.public_ip
  description = "Use this IP to SSH into the Milvus server"
}

# Keep the private IP output as well (your ECS containers still need this!)
output "milvus_private_ip" {
  value = aws_instance.milvus_db.private_ip
}
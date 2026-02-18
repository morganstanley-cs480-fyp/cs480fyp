output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.milvus.id
}

output "private_ip" {
  description = "Private IP address of the Milvus instance"
  value       = aws_instance.milvus.private_ip
}

output "public_ip" {
  description = "Public IP address of the Milvus instance"
  value       = aws_eip.milvus.public_ip
}

output "security_group_id" {
  description = "Security group ID for the Milvus instance"
  value       = aws_security_group.milvus.id
}

output "milvus_endpoint" {
  description = "Milvus endpoint for connecting from applications"
  value       = "${aws_instance.milvus.private_ip}:19530"
}

output "milvus_admin_endpoint" {
  description = "Milvus admin endpoint for monitoring"
  value       = "${aws_instance.milvus.private_ip}:9091"
}

output "iam_role_arn" {
  description = "IAM role ARN for the Milvus EC2 instance"
  value       = aws_iam_role.milvus_ec2.arn
}

output "iam_instance_profile_name" {
  description = "IAM instance profile name"
  value       = aws_iam_instance_profile.milvus_ec2.name
}
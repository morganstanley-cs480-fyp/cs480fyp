output "log_group_id" {
  description = "The ID of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.id
}

output "log_group_name" {
  description = "The name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.name
}

output "role_arn" {
  description = "The ARN of the task role to pass to the ECS module"
  value       = aws_iam_role.this.arn
}

output "role_name" {
  value = aws_iam_role.this.name
}
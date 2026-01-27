output "role_arn" {
  description = "The ARN of the IAM role for ECS task execution"
  value       = aws_iam_role.this.arn
}

output "role_arn" {
  description = "The ARN of the created IAM role"
  value       = aws_iam_role.this.arn
}

output "policy_arn" {
  description = "The ARN of the created SQS policy"
  value       = aws_iam_policy.sqs_policy.arn
}

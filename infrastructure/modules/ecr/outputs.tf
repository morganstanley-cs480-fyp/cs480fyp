output "repository_uri" {
  description = "The URI of the ECR repository."
  value       = aws_ecr_repository.this.repository_url
}

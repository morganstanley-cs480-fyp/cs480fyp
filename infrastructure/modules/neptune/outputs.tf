output "neptune_endpoint" {
  value = aws_neptune_cluster.this.endpoint
}

output "neptune_cluster_arn" {
  description = "The ARN of the Neptune cluster for IAM policy scoping"
  value       = aws_neptune_cluster.this.arn
}
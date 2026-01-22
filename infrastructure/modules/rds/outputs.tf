output "db_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "db_name" {
  description = "Name of the database"
  value       = aws_db_instance.this.db_name
}

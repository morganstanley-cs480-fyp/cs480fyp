output "id" {
  description = "The ID of the DB subnet group"
  value       = aws_db_subnet_group.this.id
}

output "name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.this.name
}

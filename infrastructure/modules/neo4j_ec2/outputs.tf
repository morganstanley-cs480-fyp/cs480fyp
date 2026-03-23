output "private_ip" {
  description = "The private IP address of the Neo4j instance"
  value       = aws_instance.neo4j_server.private_ip
}

output "bolt_url" {
  description = "The Bolt connection string for the Node.js driver"
  value       = "bolt://${aws_instance.neo4j_server.private_ip}:7687"
}
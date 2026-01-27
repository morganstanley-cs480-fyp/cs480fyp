output "ecs_service_sg_id" {
  description = "The security group ID of the ECS service"
  value       = aws_security_group.ecs_service_sg.id
}

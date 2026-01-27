resource "aws_security_group" "rds_sg" {
  name        = "rds-security-group"
  vpc_id      = var.vpc_id
  description = "Allow inbound traffic to RDS from ECS service"

  ingress {
    description     = "Postgres access from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.ecs_security_group_ids 
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_security_group" "ecs_service_sg" {
  name        = "ecs-service-security-group"
  vpc_id      = var.vpc_id
  description = "Allow inbound traffic from ALB to ECS service"

  # --- SIMPLIFIED INGRESS RULE ---
  # Allow ALL TCP ports (0-65535) from the ALB.
  # This covers port 3001, 3002, 3003... and any future ports automatically.
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [var.alb_sg_id] # Trust the Load Balancer
  }

  # Egress rule (Standard: Allow everything out)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "ecs-service-sg"
  }
}
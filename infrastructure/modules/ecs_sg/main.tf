resource "aws_security_group" "ecs_service_sg" {
  name        = "ecs-service-security-group"
  vpc_id      = var.vpc_id
  description = "Allow inbound traffic from ALB to ECS service"

  # Ingress rules for multiple ports (3000, 3001, 3002, 3003)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  ingress {
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  ingress {
    from_port   = 3003
    to_port     = 3003
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  ingress {
    from_port   = 3004
    to_port     = 3004
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  ingress {
    from_port   = 3005
    to_port     = 3005
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  ingress {
    from_port   = 3006
    to_port     = 3006
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

    ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "tcp"
    security_groups = [var.alb_sg_id]  # Reference ALB security group from module
  }

  # Egress rule for all traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

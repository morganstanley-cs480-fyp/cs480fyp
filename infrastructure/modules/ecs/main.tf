resource "aws_ecs_task_definition" "this" {
  family                   = var.family
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = var.container_image
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = var.container_port > 0 ? [
      {
        containerPort = var.container_port
        hostPort      = var.container_port
        protocol      = "tcp"
      }
      ] : []

      environment = var.environments
      secrets = var.secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.log_group
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  execution_role_arn = var.execution_role_arn
  task_role_arn      = length(var.task_role_arn) > 0 ? var.task_role_arn : null
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  force_new_deployment = true

  network_configuration {
    subnets          = var.subnets
    security_groups  = var.security_groups
    assign_public_ip = var.assign_public_ip
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  # --- CHANGED: Dynamic Block for Optional ALB ---
  dynamic "load_balancer" {
    # If variable is not null, create 1 block. Otherwise create 0 blocks.
    for_each = var.target_group_arn != null ? [1] : []
    
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.container_name
      container_port   = var.container_port
    }
  }
  # -----------------------------------------------

  # Only use grace period if LB exists, otherwise 0
  health_check_grace_period_seconds = var.target_group_arn != null ? 300 : 0
}

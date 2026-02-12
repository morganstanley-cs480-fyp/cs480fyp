resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.cluster_id}-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "redis_sg" {
  name        = "${var.cluster_id}-sg"
  vpc_id      = var.vpc_id
  description = "Allow inbound Redis traffic from ECS"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id] # Only ECS can talk to Redis
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = var.cluster_id
  description                = "Redis cluster for RDS Caching"
  node_type                  = "cache.t4g.micro" # Cheapest ARM instance
  port                       = 6379
  parameter_group_name       = "default.redis7"
  automatic_failover_enabled = false # False = Cheaper (Single Node)
  num_cache_clusters         = 1     # 1 Node
  
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis_sg.id]
  
  engine                     = "redis"
  engine_version             = "7.1"
}
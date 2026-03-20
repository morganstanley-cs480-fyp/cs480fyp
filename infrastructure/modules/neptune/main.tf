resource "aws_neptune_subnet_group" "this" {
  name       = "${var.cluster_identifier}-subnet-group"
  subnet_ids = var.public_subnet_ids
}

resource "aws_security_group" "neptune_sg" {
  name   = "${var.cluster_identifier}-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 8182
    to_port         = 8182
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id] # Link to ECS
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_neptune_cluster" "this" {
  cluster_identifier                  = var.cluster_identifier
  engine                              = "neptune"
  neptune_subnet_group_name           = aws_neptune_subnet_group.this.name
  vpc_security_group_ids             = [aws_security_group.neptune_sg.id]
  iam_database_authentication_enabled = true
  skip_final_snapshot                 = true
}

resource "aws_neptune_cluster_instance" "this" {
  count              = 1
  cluster_identifier = aws_neptune_cluster.this.id
  engine             = "neptune"
  instance_class     = "db.t3.medium"
}
resource "aws_db_instance" "this" {
  identifier             = var.db_identifier
  engine                 = "postgres"
  engine_version         = "16.6"
  port                   = 5432
  
  instance_class         = "db.t4g.micro" 
  multi_az               = false
  allocated_storage      = 20
  storage_type           = "gp3"
  
  # Network & Security
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.vpc_security_group_ids
  publicly_accessible    = false

  # Auth
  username               = var.db_username
  password               = var.db_password
  db_name                = var.db_name

  skip_final_snapshot    = true
  
  tags = {
    Name = var.db_identifier
  }
}
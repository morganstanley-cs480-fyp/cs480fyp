# Data source for latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM role for EC2 instance (CloudWatch access)
resource "aws_iam_role" "milvus_ec2" {
  name_prefix = "${var.project_name}-milvus-ec2-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-milvus-ec2-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Attach CloudWatch Agent policy
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.milvus_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Attach SSM policy for Session Manager (optional)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.milvus_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM instance profile
resource "aws_iam_instance_profile" "milvus_ec2" {
  name_prefix = "${var.project_name}-milvus-ec2-"
  role        = aws_iam_role.milvus_ec2.name

  tags = {
    Name        = "${var.project_name}-milvus-ec2-profile"
    Environment = var.environment
    Project     = var.project_name
  }
}

# EC2 instance for Milvus standalone
resource "aws_instance" "milvus" {
  ami                    = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.milvus.id]
  key_name               = var.key_name != "" ? var.key_name : null
  iam_instance_profile   = aws_iam_instance_profile.milvus_ec2.name

  # EBS storage for data persistence
  root_block_device {
    volume_type = "gp3"
    volume_size = var.volume_size
    encrypted   = true
  }

  # Additional EBS volume for Milvus data
  ebs_block_device {
    device_name = "/dev/sdf"
    volume_type = "gp3"
    volume_size = var.data_volume_size
    encrypted   = true
  }

  user_data = base64encode(file("${path.module}/user_data.sh"))

  tags = {
    Name        = "${var.project_name}-milvus"
    Environment = var.environment
    Project     = var.project_name
    Component   = "milvus"
  }
}

# Security group for Milvus EC2 instance
resource "aws_security_group" "milvus" {
  name_prefix = "${var.project_name}-milvus-"
  vpc_id      = var.vpc_id

  # Milvus default port
  ingress {
    from_port       = 19530
    to_port         = 19530
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    description     = "Milvus gRPC API"
  }

  # Milvus admin port (optional)
  ingress {
    from_port       = 9091
    to_port         = 9091
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    description     = "Milvus admin/metrics"
  }

  # SSH access (optional, for debugging)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_cidr_blocks
    description = "SSH access"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "${var.project_name}-milvus-sg"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP for static IP address
resource "aws_eip" "milvus" {
  instance = aws_instance.milvus.id
  domain   = "vpc"

  tags = {
    Name        = "${var.project_name}-milvus-eip"
    Environment = var.environment
    Project     = var.project_name
  }

  depends_on = [aws_instance.milvus]
}
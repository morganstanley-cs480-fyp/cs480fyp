# 1. Create the Key Pair inside the module
resource "aws_key_pair" "milvus_key" {
  key_name   = "milvus-ec2-key"
  public_key = file(var.public_key_path)
}

# 1. Security Group for Milvus
resource "aws_security_group" "milvus_sg" {
  name        = "milvus-db-sg"
  description = "Allow inbound traffic for Milvus Vector DB"
  vpc_id      = var.vpc_id

  # Default Milvus gRPC Port (Your Python services connect here)
  ingress {
    from_port   = 19530
    to_port     = 19530
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_block] # Only allow traffic from within your VPC
  }

  # SSH for debugging
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict this to your IP in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "milvus-sg"
  }
}

# 2. Find the latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# 3. The EC2 Instance
resource "aws_instance" "milvus_db" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3a.large" # Lowest cost tier with 8GB RAM
  subnet_id     = var.subnet_id
  key_name      = aws_key_pair.milvus_key.key_name

  vpc_security_group_ids = [aws_security_group.milvus_sg.id]

  # gp3 is the cheapest and most performant storage option
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # 4. Auto-Install Script (Runs once on boot)
  user_data = <<-EOF
    #!/bin/bash
    # Update and install Docker
    apt-get update -y
    apt-get install -y docker.io docker-compose
    systemctl enable docker
    systemctl start docker

    # Create directory for Milvus
    mkdir -p /opt/milvus
    cd /opt/milvus

    # Download official Milvus Standalone Docker Compose file
    curl -sfL https://github.com/milvus-io/milvus/releases/download/v2.4.0/milvus-standalone-docker-compose.yml -o docker-compose.yml

    # Start Milvus in the background
    docker-compose up -d
  EOF

  tags = {
    Name = "milvus-vector-db"
  }
}
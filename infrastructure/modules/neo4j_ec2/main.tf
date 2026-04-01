# 1. Get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# 2. Security Group for Neo4j
resource "aws_security_group" "neo4j_sg" {
  name        = "neo4j-ec2-sg"
  description = "Allow Bolt and HTTP traffic from ECS and Admin"
  vpc_id      = var.vpc_id

  # 1. Bolt Port for your ECS microservices
  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_block]
  }

  # 2. HTTP Port for Neo4j Browser UI (Your IP)
  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [var.my_ip] # Fixed from security_groups
  }

  # 3. Bolt Port for Neo4j Browser UI (Your IP)
  # Crucial so your browser can actually execute Cypher queries!
  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 3. The EC2 Instance
resource "aws_instance" "neo4j_server" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  vpc_security_group_ids      = [aws_security_group.neo4j_sg.id]
  associate_public_ip_address = true

  # User Data script to install Docker and run Neo4j automatically on boot
  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install docker -y
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ec2-user
              
              # Run Neo4j container with no auth, exactly like your local setup
              docker run -d \
                --name neo4j-server \
                --restart always \
                -p 7474:7474 -p 7687:7687 \
                -e NEO4J_AUTH=none \
                neo4j:5.18.0
              EOF

  tags = {
    Name = "Neo4j-Graph-Database"
  }
}
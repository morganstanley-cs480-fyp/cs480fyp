# Milvus EC2 Module

This Terraform module provisions an EC2 instance to run Milvus vector database in standalone mode.

## Features

- EC2 instance with Docker and Docker Compose
- Milvus standalone with authentication enabled
- Dedicated EBS volume for data persistence
- Security group with proper access controls
- Elastic IP for static IP address
- CloudWatch monitoring integration
- Automatic startup service configuration

## Usage

```hcl
module "milvus_ec2" {
  source = "./modules/milvus_ec2"

  project_name           = "fyp"
  environment           = "prod"
  vpc_id                = module.networking.vpc_id
  subnet_id             = module.networking.private_subnet_ids[0]
  ecs_security_group_id = module.ecs_sg.security_group_id
  key_name              = "your-ec2-key-pair"
  milvus_password       = var.milvus_password
  
  # Optional
  instance_type     = "t3.large"
  data_volume_size  = 100
  ssh_cidr_blocks   = ["10.0.0.0/16"]
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| vpc_id | VPC ID where the EC2 instance will be created | `string` | n/a | yes |
| subnet_id | Subnet ID for the EC2 instance | `string` | n/a | yes |
| ecs_security_group_id | Security group ID of ECS services that need access to Milvus | `string` | n/a | yes |
| key_name | EC2 Key Pair name for SSH access | `string` | n/a | yes |
| milvus_password | Milvus admin password | `string` | n/a | yes |
| ami_id | AMI ID for the EC2 instance | `string` | `null` | no |
| instance_type | EC2 instance type | `string` | `"t3.large"` | no |
| volume_size | Root volume size in GB | `number` | `20` | no |
| data_volume_size | Additional data volume size for Milvus data in GB | `number` | `100` | no |
| milvus_user | Milvus admin username | `string` | `"root"` | no |
| ssh_cidr_blocks | CIDR blocks allowed for SSH access | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| instance_id | EC2 instance ID |
| private_ip | Private IP address of the Milvus instance |
| public_ip | Public IP address of the Milvus instance |
| security_group_id | Security group ID for the Milvus instance |
| milvus_endpoint | Milvus endpoint for connecting from applications |
| milvus_admin_endpoint | Milvus admin endpoint for monitoring |

## Notes

- The instance will automatically start Milvus on boot
- Data is persisted on a separate EBS volume mounted at `/milvus-data`
- CloudWatch logs are automatically configured
- Security group allows access only from specified ECS security groups
- Default authentication is enabled with configurable username/password
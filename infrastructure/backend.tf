# infrastructure/backend.tf

terraform {
  # This configures WHERE the state is stored (S3)
  backend "s3" {
    bucket         = "cs480t7-terraform-state-bucket" #
    key            = "terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "terraform-lock-table"
    encrypt        = true
  }

  # This configures WHICH providers are required
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
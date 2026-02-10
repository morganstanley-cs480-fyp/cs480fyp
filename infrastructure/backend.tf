terraform {
  backend "s3" {
    bucket  = "cs480fyp-terraform-state"
    key     = "infrastructure/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
  }
}
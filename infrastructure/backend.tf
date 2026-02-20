terraform {
  backend "s3" {
    bucket         = "cs480fyp-terraform-state"
    key            = "infrastructure/terraform.tfstate" # Folder path inside the bucket
    region         = "ap-southeast-1"
    
    # dynamodb_table = "terraform-lock-table" 
    
    encrypt        = true
  }
}
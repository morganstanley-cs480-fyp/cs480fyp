provider "aws" {
  region = "ap-southeast-1"
}

S3 Bucket to store the State File
resource "aws_s3_bucket" "terraform_state" {
  # MUST BE GLOBALLY UNIQUE. Change "12345" to something random.
  bucket = "cs480t7-terraform-state-bucket" 

  # Prevent accidental deletion of this critical bucket
  lifecycle {
    prevent_destroy = true
  }
}

# Enable Versioning (Crucial: Allows you to "undo" if state gets corrupted)
resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable Encryption (Security Best Practice)
resource "aws_s3_bucket_server_side_encryption_configuration" "encrypt" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

 DynamoDB Table for Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-lock-table"
  billing_mode = "PAY_PER_REQUEST" # Cheap for low usage
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

output "bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
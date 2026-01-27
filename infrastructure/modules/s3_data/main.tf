resource "aws_s3_bucket" "this" {
  bucket        = "${var.bucket_name}-${random_id.bucket_id.hex}"
  force_destroy = true # Allows you to destroy bucket even if it has files (Good for dev)

  tags = {
    Name = "${var.bucket_name}-${random_id.bucket_id.hex}"
  }
}

# Security: Block ALL public access (Private Data Bucket)
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_id" "bucket_id" {
  byte_length = 8
}
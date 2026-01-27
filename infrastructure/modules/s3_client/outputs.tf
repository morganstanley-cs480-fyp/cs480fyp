output "bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.frontend_bucket.bucket
}

output "bucket_website_endpoint" {
  description = "The website endpoint for the S3 bucket"
  value       = aws_s3_bucket_website_configuration.this.website_endpoint
}

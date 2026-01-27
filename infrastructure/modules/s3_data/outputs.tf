output "bucket_id" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "file_key" {
  value = var.file_key # Just passes the string name (e.g. "data.xml")
}
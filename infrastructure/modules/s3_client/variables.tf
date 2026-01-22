variable "bucket_name" {
  description = "The name of the S3 bucket for the React frontend"
  type        = string
}

variable "allowed_origins" {
  description = "List of allowed origins for CORS configuration"
  type        = list(string)
}

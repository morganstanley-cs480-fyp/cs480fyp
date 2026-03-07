variable "bucket_name" {
  type = string
}

variable "file_source" {
  description = "The local path to the source file to upload to S3"
  type        = string
}

variable "file_key" {
  description = "The name the file will have inside S3"
  type        = string
  default     = "data.xml"
}
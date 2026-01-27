variable "bucket_name" {
  type = string
}

variable "source_file_path" {
  description = "Local path to your XML file (e.g., ./data/transactions.xml). Set null to skip upload."
  type        = string
  default     = null
}

variable "file_key" {
  description = "The name the file will have inside S3"
  type        = string
  default     = "data.xml"
}
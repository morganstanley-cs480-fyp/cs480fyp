variable "bucket_name" {
  type        = string
  description = "The name of your existing S3 bucket (morgan-stanley-frontend)"
}

variable "bucket_regional_domain_name" {
  type        = string
  description = "The regional domain name of the S3 bucket"
}

variable "alb_dns_name" {
  type        = string
  description = "The DNS name of the Application Load Balancer"
}
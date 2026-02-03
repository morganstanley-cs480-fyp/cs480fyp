output "arn" {
  value = aws_ssm_parameter.this.arn
}

output "parameter_name" {
  value = aws_ssm_parameter.this.name
}
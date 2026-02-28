resource "aws_ssm_parameter" "this" {
  name        = var.parameter_name
  description = var.description
  type        = var.type
  value       = var.initial_value

  # Critical: Prevent Terraform from resetting the value back to "0" 
  # every time you deploy. The Lambda will change this value, and 
  # we don't want Terraform to fight the Lambda.
  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    Name = var.parameter_name
  }
}
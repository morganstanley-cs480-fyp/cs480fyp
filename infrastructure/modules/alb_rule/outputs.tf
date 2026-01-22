output "listener_rule_arn" {
  description = "The ARN of the listener rule"
  value       = aws_lb_listener_rule.this.arn
}

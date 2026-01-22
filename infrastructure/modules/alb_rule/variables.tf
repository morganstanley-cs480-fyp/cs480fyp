variable "listener_arn" {
  description = "Listener ARN to attach the rule to"
  type        = string
}

variable "priority" {
  description = "Priority of the listener rule"
  type        = number
}

variable "path_pattern" {
  description = "Path pattern to match for routing traffic (e.g., /user/*)"
  type        = list(string)
}

variable "target_group_arn" {
  description = "The ARN of the target group to forward traffic to"
  type        = string
}

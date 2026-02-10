# 1. The Role (Who can use this? ECS Tasks)
resource "aws_iam_role" "this" {
  name = "${var.service_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# 2. The Policy (Permissions to Process the Queue)
resource "aws_iam_policy" "processing_policy" {
  name        = "${var.service_name}-sqs-policy"
  description = "Allow consuming messages from the processing queue"
}

# 3. Attach Policy to Role
resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.processing_policy.arn
}
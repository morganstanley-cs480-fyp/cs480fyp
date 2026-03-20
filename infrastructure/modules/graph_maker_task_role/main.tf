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

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",      # Pull message
          "sqs:DeleteMessage",       # Remove after processing (ACK)
          "sqs:GetQueueAttributes"   # Check queue status
        ]
        Resource = var.graph_ingestion_queue_arn
      },
    ]
  })
}

# The IAM Policy (Permissions for Neptune/Graph)
resource "aws_iam_policy" "neptune_access" {
  name        = "${var.service_name}-neptune-access"
  description = "Allows the graph-maker service to connect to Neptune"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "neptune-db:connect"
        Effect   = "Allow"
        Resource = [
          "${var.neptune_cluster_arn}/*", # Access to instances
          "${var.neptune_cluster_arn}"    # Access to cluster
        ]
      }
    ]
  })
}

# 3. Attach Policy to Role
resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.processing_policy.arn
}

# Attach this policy to the role we created earlier
resource "aws_iam_role_policy_attachment" "attach_neptune" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.neptune_access.arn
}
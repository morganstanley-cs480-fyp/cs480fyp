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
  description = "Permissions for SQS processing and graph ingestion"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # 1. Full Consumer Permissions for the Data Processing Queue
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",      # Pull message
          "sqs:DeleteMessage",       # Remove after processing (ACK)
          "sqs:GetQueueAttributes",  # Check queue status
          "sqs:ChangeMessageVisibility" # Recommended for long-running tasks
        ]
        Resource = var.data_processing_queue_arn
      },

      # 2. Producer Permission for the Graph Ingestion Queue
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",         # Send the transformed data to the next step
          "sqs:GetQueueAttributes"   # Often needed by SDKs to verify queue existence
        ]
        Resource = var.graph_ingestion_queue_arn
      }
    ]
  })
}

# 3. Attach Policy to Role
resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.processing_policy.arn
}
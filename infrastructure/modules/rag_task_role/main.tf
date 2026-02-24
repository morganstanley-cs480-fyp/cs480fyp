resource "aws_iam_role" "this" {
  name = "${var.service_name}-task-role"

  # 1. Trust Relationship (Who can assume this role? ECS Tasks)
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

# 2. Bedrock Permissions Policy
resource "aws_iam_policy" "bedrock" {
  name        = "${var.service_name}-bedrock-policy"
  description = "Allow RAG service to invoke Bedrock models"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "BedrockInvoke"
        Effect   = "Allow"
        Action   = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        # Specific Model ARNs for Singapore (ap-southeast-1)
        # Includes Claude 3 (Sonnet) and Titan Embeddings
        Resource = [
          "arn:aws:bedrock:${var.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
          "arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed-text-v1"
        ]
      },
      {
        Sid      = "BedrockList"
        Effect   = "Allow"
        Action   = "bedrock:ListFoundationModels"
        Resource = "*"
      }
    ]
  })
}

# 3. Attach Policy to Role
resource "aws_iam_role_policy_attachment" "attach_bedrock" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.bedrock.arn
}
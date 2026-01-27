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

resource "aws_iam_policy" "ingestion_policy" {
  name        = "${var.service_name}-policy"
  description = "Allow ingestion service to read XML, update SSM, and push to SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3: Read XML File
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          var.s3_bucket_arn,       # The Bucket
          "${var.s3_bucket_arn}/*" # The Files
        ]
      },
      # SSM: Read & Update Bookmark
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter", "ssm:PutParameter"]
        Resource = var.ssm_parameter_arn
      },
      # SQS: Send Data to Queue
      {
        Effect = "Allow"
        Action = ["sqs:SendMessage"]
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.ingestion_policy.arn
}
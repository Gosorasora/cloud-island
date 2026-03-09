terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = "ap-northeast-2"
  profile = "roomeya"
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "celesta_readonly" {
  name = "CelestaReadOnly"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "celesta-local-test"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "read_cloudtrail" {
  name = "ReadCloudTrail"
  role = aws_iam_role.celesta_readonly.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["cloudtrail:LookupEvents"]
        Resource = "*"
      }
    ]
  })
}

output "role_arn" {
  value       = aws_iam_role.celesta_readonly.arn
  description = "Use this Role ARN in Celesta Connect AWS tab"
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}

provider "aws" {
  region = "us-west-2"
}

provider "github" {
  token = var.github_token
}

# AWS S3 bucket configuration for production
resource "aws_s3_bucket" "my_app_bucket" {
  bucket = "my-babylonjs-app-bucket"
  acl    = "public-read"
}

resource "aws_s3_bucket_object" "my_app_files" {
  for_each = fileset("dist/", "*")
  bucket   = aws_s3_bucket.my_app_bucket.bucket
  key      = each.value
  source   = "dist/${each.value}"
}

resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.my_app_bucket.bucket
  policy = data.aws_iam_policy_document.bucket_policy.json
}

data "aws_iam_policy_document" "bucket_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.my_app_bucket.arn}/*"]
    effect    = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}

# GitHub repository configuration for production
resource "github_repository" "my_app_repo" {
  name        = "my-babylonjs-app"
  description = "A BabylonJS app hosted on GitHub Pages"
  private     = false
}

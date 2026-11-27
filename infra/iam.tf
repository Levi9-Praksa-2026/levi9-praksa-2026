# post-service needs to read and write post images in the private bucket. This is a task role: the ECS task
# definition (not created yet) will point at its ARN. The separate task execution role (ECR, logs, secrets)
# comes with the ECS work.

data "aws_iam_policy_document" "post_service_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "post_service_task" {
  name                 = "${local.name}-post-service-task"
  description          = "post-service task: read and write post images in the private S3 bucket"
  assume_role_policy   = data.aws_iam_policy_document.post_service_assume.json
  max_session_duration = 3600
  tags                 = { Name = "${local.name}-post-service-task" }
}

data "aws_iam_policy_document" "post_service_s3" {
  statement {
    sid       = "ManagePostImages"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.post_images.arn}/*"]
  }

  statement {
    sid       = "ListPostImages"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.post_images.arn]
  }
}

resource "aws_iam_role_policy" "post_service_s3" {
  name   = "post-images"
  role   = aws_iam_role.post_service_task.id
  policy = data.aws_iam_policy_document.post_service_s3.json
}

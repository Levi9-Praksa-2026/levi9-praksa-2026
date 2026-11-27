data "aws_iam_policy_document" "ecs_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
  tags               = { Owner = local.owners.ecs_iam }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role = aws_iam_role.ecs_execution.name
  # Use the AWS-managed policy ARN without a separate IAM policy lookup.
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      # Kept so a rollback to a task definition that still injects SPRING_DATASOURCE_PASSWORD can start.
      # The current task definitions no longer use this permission; it can be removed after the cutover.
      aws_db_instance.this.master_user_secret[0].secret_arn,
      aws_secretsmanager_secret.gateway_client_secret.arn,
      aws_secretsmanager_secret.jwt_private_key.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "read-startup-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

# The application reads the RDS credentials at runtime via Spring Cloud AWS.
data "aws_iam_policy_document" "ecs_task_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.this.master_user_secret[0].secret_arn]
  }
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
  for_each = local.services

  name   = "read-app-secrets"
  role   = aws_iam_role.ecs_task[each.key].id
  policy = data.aws_iam_policy_document.ecs_task_secrets.json
}

# Only auth-service may read the first admin's secret.
data "aws_iam_policy_document" "auth_bootstrap_admin" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.bootstrap_admin.arn]
  }
}

resource "aws_iam_role_policy" "auth_bootstrap_admin" {
  name   = "read-bootstrap-admin"
  role   = aws_iam_role.ecs_task["auth-service"].id
  policy = data.aws_iam_policy_document.auth_bootstrap_admin.json
}

resource "aws_iam_role" "ecs_task" {
  for_each = local.services

  name               = "${local.name}-${each.key}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
  tags               = { Owner = local.owners.ecs_iam }
}

data "aws_iam_policy_document" "post_media" {
  # S3 returns 403 for missing objects without bucket-list permission, preventing
  # post-service from distinguishing a missing image from an access failure.
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.media.arn]
  }

  statement {
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.media.arn}/*"]
  }
}

resource "aws_iam_role_policy" "post_media" {
  name   = "media-objects"
  role   = aws_iam_role.ecs_task["post-service"].id
  policy = data.aws_iam_policy_document.post_media.json
}

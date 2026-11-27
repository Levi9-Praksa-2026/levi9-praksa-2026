# Role for the image workflow: GitHub Actions on main builds the service images and pushes them to ECR.
# Same pattern as the hand-made plan and apply roles: GitHub trades its OIDC token for one-hour AWS credentials,
# so no AWS keys are stored in GitHub. The OIDC provider itself was created by hand with those roles.

locals {
  # GitHub's immutable repo identifier (org and repo IDs), as in the plan and apply roles' trust policies.
  # It stays valid if the org or repo is renamed. Only runs on main may push images.
  github_main_sub = "repo:Levi9-Praksa-2026@361079694/levi9-praksa-2026@1459855265:ref:refs/heads/main"

  # Built rather than looked up: the apply role has no permission to read IAM's OIDC providers.
  github_oidc_provider_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_ecr_push_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_main_sub]
    }
  }
}

resource "aws_iam_role" "github_ecr_push" {
  name                 = "${local.name}-github-ecr-push"
  description          = "GitHub Actions on main: push service images to the levddit ECR repositories"
  assume_role_policy   = data.aws_iam_policy_document.github_ecr_push_trust.json
  max_session_duration = 3600
  tags                 = { Name = "${local.name}-github-ecr-push" }
}

data "aws_iam_policy_document" "github_ecr_push" {
  # Logging in to ECR has no resource to scope to; AWS only accepts "*" here.
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  # Push, plus the two reads the workflow uses to skip an image that already exists (tags are immutable).
  # Only the four levddit repositories: no delete, no repository or policy changes.
  statement {
    sid = "PushToLevdditRepositories"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:DescribeImages",
    ]
    resources = [for repo in aws_ecr_repository.this : repo.arn]
  }
}

resource "aws_iam_role_policy" "github_ecr_push" {
  name   = "push-images"
  role   = aws_iam_role.github_ecr_push.id
  policy = data.aws_iam_policy_document.github_ecr_push.json
}

# Same OIDC pattern for the frontend deploy: main only, no AWS keys in GitHub. The job syncs the built
# dist/ into the private frontend bucket and invalidates the CDN so the new build is visible immediately.

data "aws_iam_policy_document" "github_frontend_deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_main_sub]
    }
  }
}

resource "aws_iam_role" "github_frontend_deploy" {
  name                 = "${local.name}-github-frontend-deploy"
  description          = "GitHub Actions on main: deploy the React build and invalidate CloudFront"
  assume_role_policy   = data.aws_iam_policy_document.github_frontend_deploy_trust.json
  max_session_duration = 3600
  tags                 = { Name = "${local.name}-github-frontend-deploy" }
}

data "aws_iam_policy_document" "github_frontend_deploy" {
  # aws s3 sync lists the bucket to work out which objects to add and remove.
  statement {
    sid       = "ListFrontendBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.frontend.arn]
  }

  statement {
    sid       = "WriteFrontendObjects"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }

  statement {
    sid       = "InvalidateFrontend"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.app.arn]
  }
}

resource "aws_iam_role_policy" "github_frontend_deploy" {
  name   = "deploy-frontend"
  role   = aws_iam_role.github_frontend_deploy.id
  policy = data.aws_iam_policy_document.github_frontend_deploy.json
}

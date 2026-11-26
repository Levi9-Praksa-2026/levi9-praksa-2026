# Office hours: RDS runs on weekdays only while the team works, so idle evenings, nights and weekends cost
# (almost) nothing. EventBridge Scheduler calls the RDS API directly; no Lambda needed.
# ECS gets its own start/stop schedules here once its services exist (scale to 1 at 08:30, to 0 at 18:00).
# The ALB has no off switch: it keeps running (and costing) until it is deleted.
#
# A stopped instance costs only its storage. AWS restarts a stopped instance by itself after 7 days, which the
# weekday schedule never reaches. While RDS is stopped, a plan that changes the instance itself fails to apply:
# start it first (aws rds start-db-instance --db-instance-identifier levddit).

data "aws_iam_policy_document" "scheduler_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }

    # Only schedules in this account may use the role.
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  name               = "${local.name}-scheduler"
  description        = "EventBridge Scheduler: start and stop levddit resources for office hours"
  assume_role_policy = data.aws_iam_policy_document.scheduler_trust.json
  tags               = { Owner = local.owners.schedule }
}

# Start and stop this one instance, nothing else.
data "aws_iam_policy_document" "scheduler" {
  statement {
    sid       = "StartStopRds"
    actions   = ["rds:StartDBInstance", "rds:StopDBInstance"]
    resources = [aws_db_instance.this.arn]
  }
}

resource "aws_iam_role_policy" "scheduler" {
  name   = "office-hours"
  role   = aws_iam_role.scheduler.id
  policy = data.aws_iam_policy_document.scheduler.json
}

locals {
  rds_schedules = {
    start = { action = "startDBInstance", cron = var.office_hours.rds_start }
    stop  = { action = "stopDBInstance", cron = var.office_hours.rds_stop }
  }
}

resource "aws_scheduler_schedule" "rds" {
  for_each = local.rds_schedules

  name                         = "${local.name}-rds-${each.key}"
  description                  = "${title(each.key)} the levddit RDS instance for office hours"
  state                        = var.office_hours.enabled ? "ENABLED" : "DISABLED"
  schedule_expression          = each.value.cron
  schedule_expression_timezone = var.office_hours.timezone # follows daylight saving time

  flexible_time_window {
    mode = "OFF" # exactly on time
  }

  target {
    # Scheduler's universal target: calls the RDS API action directly with this input.
    arn      = "arn:aws:scheduler:::aws-sdk:rds:${each.value.action}"
    role_arn = aws_iam_role.scheduler.arn
    input = jsonencode({
      DbInstanceIdentifier = aws_db_instance.this.identifier
    })

    # A start on an already running instance (or a stop on a stopped one) fails harmlessly; don't keep retrying it.
    retry_policy {
      maximum_retry_attempts = 0
    }
  }
}

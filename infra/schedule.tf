# Office hours: RDS and the ECS services run on weekdays only while the team works, so idle evenings, nights and
# weekends cost (almost) nothing. EventBridge Scheduler calls the RDS and ECS APIs directly; no Lambda needed.
# Order: RDS starts first and stops last, so the services never run without their database.
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

# Start and stop this one RDS instance and change the task count of these four services, nothing else.
data "aws_iam_policy_document" "scheduler" {
  statement {
    sid       = "StartStopRds"
    actions   = ["rds:StartDBInstance", "rds:StopDBInstance"]
    resources = [aws_db_instance.this.arn]
  }

  # UpdateService with only a desired count: no new task definition, so no iam:PassRole is needed.
  statement {
    sid       = "ScaleEcsServices"
    actions   = ["ecs:UpdateService"]
    resources = [for service in aws_ecs_service.this : service.id] # the id is the service ARN
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

# One start and one stop schedule per service (8 in total; Scheduler's free tier covers them many times over).
# Start sets the task count to office_hours.ecs_tasks, stop sets it to 0. ECS then starts or stops the tasks itself.
locals {
  ecs_schedules = merge([
    for service in keys(local.services) : {
      "${service}-start" = { service = service, cron = var.office_hours.ecs_start, count = var.office_hours.ecs_tasks }
      "${service}-stop"  = { service = service, cron = var.office_hours.ecs_stop, count = 0 }
    }
  ]...)
}

resource "aws_scheduler_schedule" "ecs" {
  for_each = local.ecs_schedules

  name                         = "${local.name}-ecs-${each.key}"
  description                  = "Scale the levddit ${each.value.service} service to ${each.value.count} for office hours"
  state                        = var.office_hours.enabled ? "ENABLED" : "DISABLED"
  schedule_expression          = each.value.cron
  schedule_expression_timezone = var.office_hours.timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ecs:updateService"
    role_arn = aws_iam_role.scheduler.arn
    input = jsonencode({
      Cluster      = aws_ecs_cluster.this.name
      Service      = aws_ecs_service.this[each.value.service].name
      DesiredCount = each.value.count
    })

    # Setting a count is safe to repeat, so a failed call may try again.
    retry_policy {
      maximum_retry_attempts = 2
    }
  }
}

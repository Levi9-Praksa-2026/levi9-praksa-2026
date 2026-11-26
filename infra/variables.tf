variable "aws_region" {
  type        = string
  description = "Region for everything except CloudFront, which is global."
  default     = "eu-central-1"
}

variable "project" {
  type        = string
  description = "Name prefix for every resource. The apply role may only manage IAM resources named levddit-*."
  default     = "levddit"

  validation {
    condition     = var.project == "levddit"
    error_message = "The GitHub apply role's IAM permissions only cover names starting with levddit-."
  }
}

variable "environment" {
  type        = string
  description = "Environment name, used in tags. There is one AWS environment."
  default     = "dev"
}

variable "owner" {
  type        = string
  description = "Owner tag on every resource: who answers for this account."
  default     = "i.radojicic-int@levi9.com"
}

variable "db_instance_class" {
  type        = string
  description = "Instance class for the RDS Postgres instance."
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  type        = number
  description = "Initial allocated storage in GiB for the RDS instance."
  default     = 20

  validation {
    condition     = var.db_allocated_storage_gb >= 20
    error_message = "RDS gp3 storage starts at 20 GiB, so the value must be at least 20."
  }
}

variable "image_tag" {
  type        = string
  description = "Git SHA of the images to run, for all four services. Leave null to run the newest image in each ECR repository; set it only to pin a version, e.g. for a rollback."
  default     = null

  validation {
    condition     = var.image_tag == null || can(regex("^[0-9a-f]{7,40}$", var.image_tag))
    error_message = "image_tag must be a git SHA (7 to 40 lowercase hex characters), never 'latest'."
  }
}

variable "public_url" {
  type        = string
  description = "APP_PUBLIC_URL for every service: the https origin the browser sees. A placeholder until CloudFront exists; then it becomes the CloudFront domain."
  default     = "https://levddit.invalid"

  validation {
    condition     = can(regex("^https://[^/]+$", var.public_url))
    error_message = "public_url must be an https:// origin with no path and no trailing slash."
  }
}

variable "jwt_key_id" {
  type        = string
  description = "APP_JWT_KEY_ID for auth-service: the name of the signing key stored in the levddit/jwt-private-key secret."
  default     = "2026-11"
}

variable "task_size" {
  type = object({
    cpu    = number
    memory = number
  })
  description = "Fargate size per task, in CPU units (1024 = 1 vCPU) and MiB. Same for all four services."
  default = {
    cpu    = 512
    memory = 1024
  }

  validation {
    condition     = contains([256, 512, 1024, 2048], var.task_size.cpu)
    error_message = "cpu must be 256, 512, 1024 or 2048; memory must be a pair Fargate allows for it."
  }
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention per service."
  default     = 14

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90], var.log_retention_days)
    error_message = "Use one of the retention values CloudWatch accepts (1, 3, 5, 7, 14, 30, 60, 90)."
  }
}

variable "office_hours" {
  type = object({
    enabled   = bool
    timezone  = string
    rds_start = string
    rds_stop  = string
  })
  description = "When RDS runs: weekdays, team office hours 08:30-18:00. RDS starts 15 minutes early (it needs 5-10 to come up) and stops 10 minutes after ECS will."
  default = {
    enabled   = true
    timezone  = "Europe/Belgrade"
    rds_start = "cron(15 8 ? * MON-FRI *)"
    rds_stop  = "cron(10 18 ? * MON-FRI *)"
  }

  validation {
    condition     = alltrue([for c in [var.office_hours.rds_start, var.office_hours.rds_stop] : can(regex("^cron\\(.+\\)$", c))])
    error_message = "rds_start and rds_stop must be EventBridge Scheduler cron expressions, e.g. cron(15 8 ? * MON-FRI *)."
  }
}

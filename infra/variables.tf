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

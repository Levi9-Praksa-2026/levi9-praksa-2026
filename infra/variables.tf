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

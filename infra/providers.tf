provider "aws" {
  region = var.aws_region

  # Every resource gets these tags, so cost and ownership are visible without tagging each one.
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.owner
    }
  }
}

# Read-only lookup: proves the credentials work and gives later files the account ID without hardcoding it.
data "aws_caller_identity" "current" {}

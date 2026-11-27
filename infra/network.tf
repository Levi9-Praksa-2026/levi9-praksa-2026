# The account's default VPC: one public subnet per availability zone, an internet gateway and routes, all created
# by AWS. Terraform only looks it up, so a destroy can never remove it.
data "aws_vpc" "default" {
  default = true
}

# AWS-managed list of the addresses CloudFront uses to reach origins. Lets only CloudFront reach the ALB.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# Subnets of the default VPC, used by the ALB and the RDS subnet group.
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# The gateway's trusted-proxies regex in ecs.tf assumes this range. Warns at plan time if it doesn't match.
check "default_vpc_cidr" {
  assert {
    condition     = data.aws_vpc.default.cidr_block == "172.31.0.0/16"
    error_message = "The default VPC is not 172.31.0.0/16; update trusted_proxies in ecs.tf to match."
  }
}

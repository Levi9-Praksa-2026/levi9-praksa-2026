# The chain: CloudFront -> ALB -> gateway -> internal services -> RDS. Each layer only accepts the one before it.
# Tasks sit in public subnets with public IPs, so these groups are the whole network boundary.
# A security group created by Terraform has no rules at all, including no outbound rule, until one is added here.
# Changing a group's name or description replaces the group, which fails while tasks or the ALB use it: treat
# both as final. Rules can change freely.

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Load balancer: HTTP from CloudFront only"
  vpc_id      = data.aws_vpc.default.id
  tags        = { Name = "${local.name}-alb" }
}

resource "aws_security_group" "gateway" {
  name        = "${local.name}-gateway"
  description = "Gateway tasks: from the ALB only"
  vpc_id      = data.aws_vpc.default.id
  tags        = { Name = "${local.name}-gateway" }
}

# One group for all three internal services, so any of them can reach the others on 8081-8083. Separate groups
# per service would allow only the calls in use (post -> community, community/post -> auth); kept simple for dev.
resource "aws_security_group" "internal" {
  name        = "${local.name}-internal"
  description = "auth, community and post tasks: from the gateway and each other only"
  vpc_id      = data.aws_vpc.default.id
  tags        = { Name = "${local.name}-internal" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "Postgres: from the services only"
  vpc_id      = data.aws_vpc.default.id
  tags        = { Name = "${local.name}-rds" }
}

# ---------- ALB ----------
resource "aws_vpc_security_group_ingress_rule" "alb_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from CloudFront origin-facing addresses"
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "alb_to_gateway" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to gateway tasks"
  referenced_security_group_id = aws_security_group.gateway.id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
}

# ---------- gateway ----------
resource "aws_vpc_security_group_ingress_rule" "gateway_from_alb" {
  security_group_id            = aws_security_group.gateway.id
  description                  = "HTTP from the ALB"
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
}

# ---------- internal services ----------
resource "aws_vpc_security_group_ingress_rule" "internal_from_gateway" {
  security_group_id            = aws_security_group.internal.id
  description                  = "Gateway calls the services"
  referenced_security_group_id = aws_security_group.gateway.id
  ip_protocol                  = "tcp"
  from_port                    = 8081
  to_port                      = 8083
}

resource "aws_vpc_security_group_ingress_rule" "internal_from_internal" {
  security_group_id            = aws_security_group.internal.id
  description                  = "Services call each other (JWKS, community internal endpoints)"
  referenced_security_group_id = aws_security_group.internal.id
  ip_protocol                  = "tcp"
  from_port                    = 8081
  to_port                      = 8083
}

# ---------- outbound for tasks ----------
# Tasks need the internet (through their public IP) for ECR, Secrets Manager, CloudWatch Logs and S3.
resource "aws_vpc_security_group_egress_rule" "tasks_all_out" {
  for_each = {
    gateway  = aws_security_group.gateway.id
    internal = aws_security_group.internal.id
  }

  security_group_id = each.value
  description       = "All outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ---------- RDS ----------
resource "aws_vpc_security_group_ingress_rule" "rds_from_tasks" {
  for_each = {
    gateway  = aws_security_group.gateway.id
    internal = aws_security_group.internal.id
  }

  security_group_id            = aws_security_group.rds.id
  description                  = "Postgres from ${each.key} tasks"
  referenced_security_group_id = each.value
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

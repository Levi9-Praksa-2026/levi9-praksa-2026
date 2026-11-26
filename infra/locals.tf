locals {
  # Prefix for resource names. The apply role may only manage IAM resources named levddit-*.
  name = var.project
  owners = {
    alb = "r.trajkovski-int@levi9.com"
    # network, rds, ecr, ecs... added as each part lands
  }
}

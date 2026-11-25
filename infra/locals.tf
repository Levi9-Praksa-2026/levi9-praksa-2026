locals {
  # Prefix for resource names. The apply role may only manage IAM resources named levddit-*.
  name = var.project
}

# One RDS instance for the whole stack. One database ("reddit"), with a schema per service:
# auth, community, post and gateway. Flyway creates those schemas and their tables when the
# services start, exactly as it does locally, so Terraform only owns the instance, its
# network placement and its master credentials.

# The default VPC has one public subnet per AZ. A subnet group needs subnets in at least two
# AZs. The instance is not publicly accessible and the rds security group is the boundary,
# so no new subnets are needed for dev.
resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db"
  subnet_ids = data.aws_subnets.default.ids

  tags = { Name = "${local.name}-db" }
}

resource "aws_db_instance" "this" {
  identifier = local.name

  # A major-version prefix lets RDS choose the latest 17 minor, including minor upgrades
  # applied during the maintenance window, without a plan diff every time AWS ships one.
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.db_instance_class

  allocated_storage       = var.db_allocated_storage_gb
  storage_type            = "gp3"
  storage_encrypted       = true
  backup_retention_period = 7

  db_name  = "reddit"
  username = "reddit"

  # RDS generates the master password and keeps it in a Secrets Manager secret it owns. No password in
  # Terraform state. RDS rotates this secret automatically every 7 days by default (Secrets Manager's
  # single-user rotation); the apps pick up the new password from the secret within 30 s.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  auto_minor_version_upgrade = true
  apply_immediately          = false
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name}-final"
  deletion_protection        = true

  # Two guards: deletion_protection blocks the AWS API, prevent_destroy blocks Terraform
  # plans that would destroy or replace the instance. Remove both to delete it deliberately.
  lifecycle {
    prevent_destroy = true
  }
}

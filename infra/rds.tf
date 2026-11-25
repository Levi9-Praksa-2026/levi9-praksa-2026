# One RDS instance for the whole stack. One database ("reddit"), with a schema per service:
# auth, community, post and gateway. Flyway creates those schemas and their tables when the
# services start, exactly as it does locally, so Terraform only owns the instance, its
# network placement and its master credentials.

# The default VPC has one public subnet per AZ. A subnet group needs subnets in at least two
# AZs. The instance is not publicly accessible and the rds security group is the boundary,
# so no new subnets are needed for dev.
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Pick the newest postgres 17 minor available in this region. A bare "17" can match several
# engine versions, so latest = true is needed to avoid an ambiguous result.
data "aws_rds_engine_version" "postgres" {
  engine  = "postgres"
  version = "17"
  latest  = true
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db"
  subnet_ids = data.aws_subnets.default.ids

  tags = { Name = "${local.name}-db" }
}

resource "aws_db_instance" "this" {
  identifier = "${local.name}-dev"

  engine         = "postgres"
  engine_version = data.aws_rds_engine_version.postgres.version
  instance_class = "db.t4g.micro"

  allocated_storage       = 20
  storage_type            = "gp3"
  storage_encrypted       = true
  backup_retention_period = 7

  db_name  = "reddit"
  username = "reddit"

  # RDS generates the master password and keeps it in a Secrets Manager secret it owns.
  # No password in Terraform state, and Secrets Manager handles rotation.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  auto_minor_version_upgrade = true
  apply_immediately          = false
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name}-dev-final"
  deletion_protection        = false # dev only: turn on before anyone relies on this database
}

output "rds_endpoint" {
  value = aws_db_instance.this.endpoint
}

output "rds_jdbc_url" {
  value = "jdbc:postgresql://${aws_db_instance.this.endpoint}/${aws_db_instance.this.db_name}"
}

output "rds_secret_arn" {
  value = aws_db_instance.this.master_user_secret[0].secret_arn
}

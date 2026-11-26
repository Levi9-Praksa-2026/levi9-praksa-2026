output "rds_endpoint" {
  value = aws_db_instance.this.endpoint
}

output "rds_jdbc_url" {
  value = "jdbc:postgresql://${aws_db_instance.this.endpoint}/${aws_db_instance.this.db_name}"
}

output "rds_secret_arn" {
  value = aws_db_instance.this.master_user_secret[0].secret_arn
}

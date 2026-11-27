output "rds_endpoint" {
  value = aws_db_instance.this.endpoint
}

output "rds_jdbc_url" {
  value = "jdbc:postgresql://${aws_db_instance.this.endpoint}/${aws_db_instance.this.db_name}"
}

output "rds_secret_arn" {
  value = aws_db_instance.this.master_user_secret[0].secret_arn
}
output "alb_dns_name" {
  value = aws_lb.gateway.dns_name
}

output "github_ecr_push_role_arn" {
  description = "Set as the repository variable AWS_ECR_PUSH_ROLE_ARN for the image workflow."
  value       = aws_iam_role.github_ecr_push.arn
}

output "gateway_target_group_arn" {
  value = aws_lb_target_group.gateway.arn
}

output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arns" {
  value = { for service, role in aws_iam_role.ecs_task : service => role.arn }
}

output "media_bucket_name" {
  description = "Bucket name for the post-service S3_BUCKET setting."
  value       = aws_s3_bucket.media.id
}

output "ecs_cluster_name" {
  description = "For aws ecs update-service (starting and stopping services by hand)."
  value       = aws_ecs_cluster.this.name
}

output "running_image_tags" {
  description = "The image tag each service's task definition uses."
  value       = local.image_tags
}

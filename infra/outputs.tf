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

output "frontend_bucket_name" {
  description = "Set as the repository variable FRONTEND_BUCKET for the frontend deploy job."
  value       = aws_s3_bucket.frontend.bucket
}

output "post_images_bucket_name" {
  description = "Set as S3_BUCKET on the post-service task; the default in application.yml is only for Moto."
  value       = aws_s3_bucket.post_images.bucket
}

output "cloudfront_distribution_id" {
  description = "Set as the repository variable CLOUDFRONT_DISTRIBUTION_ID for the frontend deploy job."
  value       = aws_cloudfront_distribution.app.id
}

output "cloudfront_domain_name" {
  description = "The site's https origin: set APP_PUBLIC_URL on all four services to this value."
  value       = aws_cloudfront_distribution.app.domain_name
}

output "github_frontend_deploy_role_arn" {
  description = "Set as the repository variable AWS_FRONTEND_DEPLOY_ROLE_ARN for the frontend deploy job."
  value       = aws_iam_role.github_frontend_deploy.arn
}

output "post_service_task_role_arn" {
  description = "Attach as the task role in the post-service ECS task definition, so it can use the images bucket."
  value       = aws_iam_role.post_service_task.arn
}
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

output "running_images" {
  description = "The image each service's task definition uses: its digest, and every commit tag on it (an unchanged service's image carries the tags of several commits)."
  value = {
    for service, image in data.aws_ecr_image.this : service => {
      digest = image.image_digest
      tags   = image.image_tags
    }
  }
}

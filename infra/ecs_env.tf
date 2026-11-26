# The services' production configuration on AWS: the environment variables and secrets each task starts with.
# Adding a setting to a service's application.yml that production must set? Add it here.
# What each service requires is listed in docs/production-changes.md.

locals {
  # Until CloudFront exists, var.public_url is a placeholder: services start, but login fails (token issuer mismatch).
  # When CloudFront lands this becomes "https://${aws_cloudfront_distribution.this.domain_name}".
  public_url = var.public_url

  # auth-service's public signing key, through its Service Connect name (same URL as docker-compose).
  jwks_uri = "http://auth-service:8081/oauth2/jwks"

  # The gateway trusts X-Forwarded-For only from these addresses (docs/production-changes.md, "Trusted proxies").
  # The ALB sits in the default VPC (172.31.0.0/16, checked in network.tf), and only the ALB can reach the gateway.
  trusted_proxies = "172\\.31\\..*"

  # Settings every service needs. No SPRING_PROFILES_ACTIVE on purpose: production runs without "dev".
  # Each service picks its own schema in its application.yml, so one datasource URL fits all four.
  common_env = {
    APP_PUBLIC_URL             = local.public_url
    SPRING_DATASOURCE_URL      = "jdbc:postgresql://${aws_db_instance.this.address}:${aws_db_instance.this.port}/${aws_db_instance.this.db_name}"
    SPRING_DATASOURCE_USERNAME = aws_db_instance.this.username
    JAVA_TOOL_OPTIONS          = "-XX:MaxRAMPercentage=75" # the JVM sizes itself to the container's memory
  }

  service_env = {
    gateway = merge(local.common_env, {
      AUTH_SERVICE_URL                                  = "http://auth-service:8081"
      COMMUNITY_SERVICE_URL                             = "http://community-service:8082"
      POST_SERVICE_URL                                  = "http://post-service:8083"
      SPRING_CLOUD_GATEWAY_SERVER_WEBMVC_TRUSTEDPROXIES = local.trusted_proxies
    })
    auth-service = merge(local.common_env, {
      APP_JWT_KEY_ID = var.jwt_key_id
    })
    community-service = merge(local.common_env, {
      AUTH_JWKS_URI = local.jwks_uri
    })
    post-service = merge(local.common_env, {
      AUTH_JWKS_URI = local.jwks_uri
      # /internal community and membership checks when a post is created. Required: no fallback outside "dev".
      # The calls carry no token, so they must stay on the internal network (Service Connect, internal security group).
      COMMUNITY_SERVICE_URL = "http://community-service:8082"
      S3_BUCKET             = aws_s3_bucket.media.bucket
      AWS_REGION            = var.aws_region
    })
  }

  # Secrets: only ARNs are written here. ECS fetches the values with the execution role when a task starts, so they
  # never appear in the task definition or in Terraform state. ":password::" picks one key out of RDS's JSON secret.
  db_password = "${aws_db_instance.this.master_user_secret[0].secret_arn}:password::"

  service_secrets = {
    gateway = {
      SPRING_DATASOURCE_PASSWORD      = local.db_password
      APP_OAUTH_GATEWAY_CLIENT_SECRET = aws_secretsmanager_secret.gateway_client_secret.arn
    }
    auth-service = {
      SPRING_DATASOURCE_PASSWORD      = local.db_password
      APP_OAUTH_GATEWAY_CLIENT_SECRET = aws_secretsmanager_secret.gateway_client_secret.arn
      APP_JWT_PRIVATE_KEY             = aws_secretsmanager_secret.jwt_private_key.arn
    }
    community-service = {
      SPRING_DATASOURCE_PASSWORD = local.db_password
    }
    post-service = {
      SPRING_DATASOURCE_PASSWORD = local.db_password
    }
  }
}

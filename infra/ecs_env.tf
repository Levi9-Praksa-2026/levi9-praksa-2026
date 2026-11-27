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
  # The RDS-managed secret is imported by the application itself (task role), so a rotated password reaches the
  # pool without a task replacement. Its JSON keys become spring.datasource.* (username + password).
  common_env = {
    APP_PUBLIC_URL        = local.public_url
    SPRING_DATASOURCE_URL = "jdbc:postgresql://${aws_db_instance.this.address}:${aws_db_instance.this.port}/${aws_db_instance.this.db_name}"
    # One aws-secretsmanager: location only. Multiple imports use commas, not semicolons (a semicolon means
    # another secret name in the same import, which would also inherit ?prefix=).
    SPRING_CONFIG_IMPORT = "aws-secretsmanager:${aws_db_instance.this.master_user_secret[0].secret_arn}?prefix=spring.datasource."
    # The client needs a region before it can read the secret, so this bootstrap value cannot come from a secret.
    # Base application.yml disables the integration for local runs; production turns it back on here.
    SPRING_CLOUD_AWS_REGION_STATIC                  = var.aws_region
    SPRING_CLOUD_AWS_SECRETSMANAGER_ENABLED         = "true"
    SPRING_CLOUD_AWS_SECRETSMANAGER_RELOAD_STRATEGY = "refresh"
    SPRING_CLOUD_AWS_SECRETSMANAGER_RELOAD_PERIOD   = "30s"
    JAVA_TOOL_OPTIONS                               = "-XX:MaxRAMPercentage=75" # the JVM sizes itself to the container's memory
  }

  # Non-secret settings stay as environment variables: the beans that consume them are built at startup,
  # so a Secrets Manager import would not make them changeable without a deployment anyway.
  service_env = {
    gateway = merge(local.common_env, {
      SPRING_CLOUD_GATEWAY_SERVER_WEBMVC_TRUSTEDPROXIES = local.trusted_proxies
      AUTH_SERVICE_URL                                  = "http://auth-service:8081"
      COMMUNITY_SERVICE_URL                             = "http://community-service:8082"
      POST_SERVICE_URL                                  = "http://post-service:8083"
    })
    auth-service = merge(local.common_env, {
      APP_JWT_KEY_ID = var.jwt_key_id
      # The RDS secret as for every service, plus the first admin's (secrets.tf). optional: a missing, empty or
      # deleted secret doesn't stop startup, it only means no bootstrap admin.
      SPRING_CONFIG_IMPORT = join(",", [
        local.common_env.SPRING_CONFIG_IMPORT,
        "optional:aws-secretsmanager:${aws_secretsmanager_secret.bootstrap_admin.arn}?prefix=app.bootstrap-admin.",
      ])
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

  # These two are still injected by ECS at task start, so the execution role reads them. The DB credentials are
  # imported by the application itself through SPRING_CONFIG_IMPORT and the task role instead.
  service_secrets = {
    gateway = {
      APP_OAUTH_GATEWAY_CLIENT_SECRET = aws_secretsmanager_secret.gateway_client_secret.arn
    }
    auth-service = {
      APP_OAUTH_GATEWAY_CLIENT_SECRET = aws_secretsmanager_secret.gateway_client_secret.arn
      APP_JWT_PRIVATE_KEY             = aws_secretsmanager_secret.jwt_private_key.arn
    }
    community-service = {}
    post-service      = {}
  }
}

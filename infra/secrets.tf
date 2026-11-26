# The two application secrets auth-service and the gateway need in production (see
# docs/production-changes.md). These create the secret containers only: the values are not in
# the repo or in Terraform state. Put them in with `aws secretsmanager put-secret-value` (or a
# later secret_version resource) before deploying the services; an empty secret cannot be read.

resource "aws_secretsmanager_secret" "gateway_client_secret" {
  name                    = "${local.name}/gateway-client-secret"
  description             = "APP_OAUTH_GATEWAY_CLIENT_SECRET, shared by gateway and auth-service"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret" "jwt_private_key" {
  name                    = "${local.name}/jwt-private-key"
  description             = "APP_JWT_PRIVATE_KEY for auth-service: the PEM of the token signing key"
  recovery_window_in_days = 7
}

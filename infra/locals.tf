locals {
  # Prefix for resource names. The apply role may only manage IAM resources named levddit-*.
  name = var.project
  owners = {
    alb     = "r.trajkovski-int@levi9.com"
    ecs_iam = "a.dejanovic-int@levi9.com"
    media   = "a.dejanovic-int@levi9.com"
    ecs     = "i.radojicic-int@levi9.com"
    rds     = "ma.ivanovic-int@levi9.com"
    # Other resource owners are added as each part lands.
  }
  # The backend services: the list every per-service resource loops over. Names match the module folders and
  # docker-compose service names; ports match each Dockerfile's EXPOSE.
  #   behind_alb:   the ALB forwards public traffic to it (only the gateway)
  #   discoverable: other services call it by name through Service Connect
  services = {
    gateway           = { port = 8080, behind_alb = true, discoverable = false }
    auth-service      = { port = 8081, behind_alb = false, discoverable = true }
    community-service = { port = 8082, behind_alb = false, discoverable = true }
    post-service      = { port = 8083, behind_alb = false, discoverable = true }
  }
}

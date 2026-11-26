locals {
  # Prefix for resource names. The apply role may only manage IAM resources named levddit-*.
  name = var.project
  owners = {
    alb   = "r.trajkovski-int@levi9.com"
    ecs   = "a.dejanovic-int@levi9.com"
    media = "a.dejanovic-int@levi9.com"
    # Other resource owners are added as each part lands.
  }
  # The backend services: the list every per-service resource loops over. Names match the module folders and
  # docker-compose service names; ports match each Dockerfile's EXPOSE.
  services = {
    gateway           = { port = 8080 }
    auth-service      = { port = 8081 }
    community-service = { port = 8082 }
    post-service      = { port = 8083 }
  }
}

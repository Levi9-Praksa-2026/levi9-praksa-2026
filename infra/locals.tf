locals {
  # Prefix for resource names. The apply role may only manage IAM resources named levddit-*.
  name = var.project
  owners = {
    alb      = "r.trajkovski-int@levi9.com"
    ecs_iam  = "a.dejanovic-int@levi9.com"
    media    = "a.dejanovic-int@levi9.com"
    ecs      = "i.radojicic-int@levi9.com"
    schedule = "i.radojicic-int@levi9.com"
    rds      = "ma.ivanovic-int@levi9.com"
    # Other resource owners are added as each part lands.
  }
  # The backend services: the list every per-service resource loops over. Names match the module folders and
  # docker-compose service names; ports match each Dockerfile's EXPOSE. The gateway is the only one behind the ALB
  # and the only one without a Service Connect name; ecs.tf gives it its own service resource.
  services = {
    gateway           = { port = 8080 }
    auth-service      = { port = 8081 }
    community-service = { port = 8082 }
    post-service      = { port = 8083 }
  }
}

locals {
  # Prefix for resource names. The apply role may only manage IAM resources named levddit-*.
  name = var.project
  owners = {

    # network, rds, ecr, ecs... added as each part lands
    alb      = "r.trajkovski-int@levi9.com"
    ecs_iam  = "a.dejanovic-int@levi9.com"
    media    = "a.dejanovic-int@levi9.com"
    ecs      = "i.radojicic-int@levi9.com"
    schedule = "i.radojicic-int@levi9.com"
    rds      = "ma.ivanovic-int@levi9.com"
    cloudfront = "ma.ivanovic-int@levi9.com"
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
  # Paths CloudFront sends to the ALB; everything else comes from the frontend bucket. Keep in step with
  # frontend/nginx.conf and frontend/vite.config.ts. /api* also covers /api-docs.
  gateway_paths = [
    "/api*",
    "/oauth2*",
    "/login/oauth2*",
    "/connect*",
    "/.well-known*",
    "/logout",
  ]
  # Stable IDs of AWS-managed CloudFront policies (AWS docs: "Use managed cache policies" and
  # "Use managed origin request policies"). Published and immutable, so no data source lookup is needed.
  cloudfront_managed_policies = {
    caching_disabled       = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    caching_optimized      = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    all_viewer_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }
}
}

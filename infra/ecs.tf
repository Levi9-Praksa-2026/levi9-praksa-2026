# The four backend services on Fargate. No servers to manage: each task gets its own small VM, its own network card
# in the VPC and its own security group. A service keeps the wanted number of tasks running and replaces them on
# failure or deploy. Roles come from iam_ecs.tf, the media bucket from media.tf, the target group from alb.tf.

# The services' environment variables and secrets are in ecs_env.tf.

locals {
  # Which image each service runs: the pinned var.image_tag if set, otherwise the newest image in its repository.
  image_tags = {
    for service, image in data.aws_ecr_image.latest : service => coalesce(var.image_tag, image.image_tags[0])
  }
}

# ---------- which version to run ----------
# The newest image the image workflow pushed to each repository. A deploy is: release to main (the workflow pushes
# new images), then "Terraform apply". Plan and apply both ask ECR, so they always agree on the version.
data "aws_ecr_image" "latest" {
  for_each = local.services

  repository_name = aws_ecr_repository.this[each.key].name
  most_recent     = true
}

# ---------- cluster + Service Connect ----------
# Service Connect: services find each other by name (http://auth-service:8081) through this namespace.
resource "aws_service_discovery_http_namespace" "this" {
  name        = local.name
  description = "Service Connect names for levddit services"
  tags        = { Owner = local.owners.ecs }
}

resource "aws_ecs_cluster" "this" {
  name = local.name
  tags = { Owner = local.owners.ecs }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.this.arn
  }
}

resource "aws_cloudwatch_log_group" "this" {
  for_each = local.services

  name              = "/ecs/${local.name}/${each.key}"
  retention_in_days = var.log_retention_days
  tags              = { Owner = local.owners.ecs }
}

# ---------- task definitions: the recipe ----------
resource "aws_ecs_task_definition" "this" {
  for_each = local.services

  family                   = "${local.name}-${each.key}"
  requires_compatibilities = ["FARGATE"] # Fargate, declared here ...
  network_mode             = "awsvpc"    # ... which allows only this network mode
  cpu                      = var.task_size.cpu
  memory                   = var.task_size.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task[each.key].arn
  tags                     = { Owner = local.owners.ecs }

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64" # the image workflow builds linux/amd64
  }

  container_definitions = jsonencode([{
    name      = each.key
    image     = "${aws_ecr_repository.this[each.key].repository_url}:${local.image_tags[each.key]}"
    essential = true

    portMappings = [{
      name          = "http" # Service Connect refers to the port by this name
      containerPort = each.value.port
      protocol      = "tcp"
    }]

    environment = [for k, v in local.service_env[each.key] : { name = k, value = v }]
    secrets     = [for k, v in local.service_secrets[each.key] : { name = k, valueFrom = v }]

    # The images are Alpine-based, so busybox wget is available. Every service permits /actuator/health.
    healthCheck = {
      command     = ["CMD-SHELL", "wget -q -O /dev/null http://localhost:${each.value.port}/actuator/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 90 # Spring Boot on half a vCPU needs time to start
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.this[each.key].name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "app"
      }
    }
  }])
}

# ---------- services: the supervisor ----------
resource "aws_ecs_service" "this" {
  for_each = local.services

  name            = each.key
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this[each.key].arn
  launch_type     = "FARGATE" # ... and here: run this service's tasks on Fargate
  propagate_tags  = "SERVICE" # tasks get the service's tags, Owner included
  tags            = { Owner = local.owners.ecs }

  # Created stopped: the secrets need values first, and services are best started one by one while checking logs.
  # After creation, the office-hours schedule (or aws ecs update-service) owns this number; Terraform ignores it.
  desired_count = 0

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [each.value.behind_alb ? aws_security_group.gateway.id : aws_security_group.internal.id]
    assign_public_ip = true # no NAT gateway: the public IP is how tasks reach ECR and other AWS APIs
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.this.arn

    # The gateway only calls others, so it joins as a client without a name of its own.
    dynamic "service" {
      for_each = each.value.discoverable ? [1] : []
      content {
        port_name      = "http"
        discovery_name = each.key
        client_alias {
          dns_name = each.key
          port     = each.value.port
        }
      }
    }
  }

  # Only the gateway is registered in the ALB's target group.
  dynamic "load_balancer" {
    for_each = each.value.behind_alb ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.gateway.arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  # Spring Boot needs time to start; the ALB's verdict is ignored for the first 2 minutes.
  health_check_grace_period_seconds = each.value.behind_alb ? 120 : null

  # A deployment that keeps failing is rolled back to the last working task definition.
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  # The target group must be attached to the ALB (through the listener rule) before a service can use it.
  depends_on = [aws_lb_listener_rule.from_cloudfront]
}

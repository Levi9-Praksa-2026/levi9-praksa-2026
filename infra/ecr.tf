# One image repository per service: <account>.dkr.ecr.<region>.amazonaws.com/levddit/<service>.
# Images are tagged with the git SHA they were built from.

resource "aws_ecr_repository" "this" {
  for_each = local.services

  name                 = "${local.name}/${each.key}"
  image_tag_mutability = "IMMUTABLE" # a SHA tag always means the same image, so rollback is exact

  image_scanning_configuration {
    scan_on_push = true # basic vulnerability scan, free
  }

  tags = { Name = "${local.name}/${each.key}" }
}

# Keep the last 10 images per service; older ones are deleted so storage stays near zero.
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

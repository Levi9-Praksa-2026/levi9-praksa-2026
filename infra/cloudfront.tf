# One CDN in front of everything. The browser sees a single https origin: CloudFront sends the gateway's
# paths to the ALB (already locked to CloudFront in alb.tf and security_groups.tf) and everything else to
# the private frontend bucket through OAC.

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name}-frontend-oac"
  description                       = "CloudFront reads the private frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The build has two HTML entry points (index.html and welcome/index.html) and React Router owns every other
# path. A viewer-request function sends extensionless paths to the right HTML; real files keep their key.
resource "aws_cloudfront_function" "spa_routing" {
  name    = "${local.name}-spa-routing"
  runtime = "cloudfront-js-2.0"
  comment = "React SPA fallback, including the second /welcome entry point"
  publish = true

  code = <<-EOT
    function handler(event) {
      var uri = event.request.uri;
      if (uri === '/welcome' || uri === '/welcome/') {
        event.request.uri = '/welcome/index.html';
        return event.request;
      }
      var last = uri.substring(uri.lastIndexOf('/') + 1);
      if (last.indexOf('.') === -1) {
        event.request.uri = '/index.html';
      }
      return event.request;
    }
  EOT
}

# Post images: the API sets Cache-Control: max-age=86400, so CloudFront caches the bytes by URL only.
# No cookies or headers in the key: image responses are public and must not be fragmented per session.
resource "aws_cloudfront_cache_policy" "post_images" {
  name    = "${local.name}-post-images"
  comment = "Cache GET /api/posts/*/images/* by URL; honour the origin's Cache-Control (max 1 day)"

  default_ttl = 0
  min_ttl     = 0
  max_ttl     = 86400

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  comment             = "levddit: React from S3, gateway API from ALB"
  default_root_object = "index.html"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100" # EU and North America edge locations

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    domain_name = aws_lb.gateway.dns_name
    origin_id   = "gateway-alb"

    # The ALB listener answers 403 to every request without this header (alb.tf).
    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_verify.result
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # the ALB listener is HTTP only
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # More specific than /api*, so it must come first. Caching is on for this path only.
  ordered_cache_behavior {
    path_pattern           = "/api/posts/*/images/*"
    target_origin_id       = "gateway-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.post_images.id
    compress               = false # JPEG and PNG are already compressed
  }

  # Sessions, CSRF cookies, query strings and 16 MB upload bodies all reach the gateway. CloudFront also
  # adds CloudFront-Viewer-Address with the real client IP (useful for the auth-service rate limiter).
  dynamic "ordered_cache_behavior" {
    for_each = local.gateway_paths

    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = "gateway-alb"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods           = ["GET", "HEAD"]
      cache_policy_id          = local.cloudfront_managed_policies.caching_disabled
      origin_request_policy_id = local.cloudfront_managed_policies.all_viewer_except_host
      compress                 = false
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = local.cloudfront_managed_policies.caching_optimized
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_routing.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

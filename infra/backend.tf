# The state bucket was created by hand. Backend blocks can't use variables,
# so these values are literal.
terraform {
  backend "s3" {
    bucket       = "levddit-tfstate-466578118705"
    key          = "levddit/dev/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true # S3-native locking; no DynamoDB table
  }
}

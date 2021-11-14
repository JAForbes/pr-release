terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
    cloudflare = {
      source = "cloudflare/cloudflare"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    # change to mithril aws account later
    bucket = "pr-release.org"
    key = "tfstate.json"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.AWS_REGION
  access_key = var.AWS_ACCESS_KEY_ID
  secret_key = var.AWS_SECRET_ACCESS_KEY
}

provider "cloudflare" {
  api_token = var.CF_TOKEN
  account_id = var.CF_ACCOUNT_ID
}

variable "AWS_REGION" {}
variable "AWS_ACCESS_KEY_ID" { sensitive = true }
variable "AWS_SECRET_ACCESS_KEY" { sensitive = true }
variable "CF_TOKEN" { sensitive = true }
variable "CF_ACCOUNT_ID" { sensitive = true }

variable "CF_ZONE_ID" {sensitive = true}

variable "CNAME" {}

variable "BUCKET" {
  description = "A globally unique bucket name with a domain style name"
}

resource "aws_s3_bucket" "docs" {
  bucket = var.BUCKET
  acl    = "public-read"
  policy = trimspace(
    <<EOF
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::${var.BUCKET}/*"
            }
        ]
    }
    EOF
  )

  force_destroy = true

  website {
    index_document = "index.html"

    # For hacky SPA goodness (badness)
    error_document = "index.html"
  }
}

resource "cloudflare_record" "app_dns_record" {
  zone_id = var.CF_ZONE_ID
  # Use "@" for root
  name    = var.CNAME 
  value   = aws_s3_bucket.docs.website_endpoint
  type    = "CNAME"
  proxied = true
}

data "external" "checksum" {
  program = [ "node", "ops/docs-checksum.js" ]
  working_dir = "../"
}

resource "null_resource" "files" {
  triggers = {
    md5 = "${data.external.checksum.result["checksum"]}"
  }

  provisioner "local-exec" {
    command = trimspace(
      <<EOF
      node ops/deploy-docs.js
      EOF
    )
    interpreter = ["/bin/bash", "-c"]
    working_dir = "../"
  }
}
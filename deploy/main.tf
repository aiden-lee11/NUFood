terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.12.0"
    }
  }
}

provider "aws" {
  region = "us-west-1"
  alias  = "northern-california"
}

// https://registry.terraform.io/providers/hashicorp/local/latest/docs/data-sources/file
data "local_file" "nufood_instance_key" {
  filename = "${path.module}/keys/nufood_ec2.pub"
}

// https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
data "http" "my_ip" {
  url = "http://checkip.amazonaws.com/"
}

// https://developer.hashicorp.com/terraform/cli/commands/output
output "instance_ip" {
  description = "ip address of nufood instance"
  value       = one(aws_instance.nufood[*].public_ip)
}


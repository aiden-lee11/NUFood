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


data "local_file" "nufood_instance_key" {
  filename = "${path.module}/keys/nufood_ec2.pub"
}

data "http" "my_ip" {
  url = "http://checkip.amazonaws.com/"
}


output "instance_ip" {
  description = "ip address of nufood instance"
  value       = one(aws_instance.nufood[*].public_ip)
}


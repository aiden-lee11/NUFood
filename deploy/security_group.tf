

// https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
resource "aws_security_group" "nufood_instance" {
  name   = "nufood_ec2"
  vpc_id = aws_vpc.nufood.id

  ingress {
    from_port = 22
    to_port   = 22
    protocol  = "TCP"
    // this will allow only your IP to connect to the instance on port 22 ( for ssh )
    cidr_blocks = ["${chomp(data.http.my_ip.body)}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }


  lifecycle {
    create_before_destroy = true
  }
}

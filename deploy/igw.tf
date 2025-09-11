// https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
resource "aws_internet_gateway" "nufood" {
  vpc_id = aws_vpc.nufood.id

  tags = {
    Name = "nufood"
  }
}

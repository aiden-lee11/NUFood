
resource "aws_internet_gateway" "nufood" {
  vpc_id = aws_vpc.nufood.id

  tags = {
    Name = "nufood"
  }
}

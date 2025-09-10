
resource "aws_subnet" "nufood_west_2a" {
  vpc_id            = aws_vpc.nufood.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "us-west-2a"

  map_public_ip_on_launch = true

  tags = {
    Name = "public_west_2a"
  }
}


resource "aws_route_table_association" "nufood" {
  subnet_id      = aws_subnet.nufood_west_2a.id
  route_table_id = aws_route_table.nufood.id
}

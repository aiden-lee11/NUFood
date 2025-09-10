

resource "aws_instance" "nufood" {
  ami           = "ami-03aa99ddf5498ceb9"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.nufood.key_name
  subnet_id     = aws_subnet.nufood_west_2a.id

  vpc_security_group_ids = [aws_security_group.nufood_instance.id]

  iam_instance_profile = aws_iam_instance_profile.nufood.name

  depends_on = [aws_security_group.nufood_instance]


  tags = {
    Name = "nufood"
  }
}


# ec2 profile
resource "aws_iam_instance_profile" "nufood" {
  name = "nu_food"
  role = aws_iam_role.nufood.name
}



resource "aws_iam_role" "nufood" {
  name = "nufood"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole",
      "Sid" : ""
    }
  ]
}
EOF
}


resource "aws_key_pair" "nufood" {
  key_name   = "nufood"
  public_key = data.local_file.nufood_instance_key.content
}






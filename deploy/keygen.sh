!#/bin/bash
# this generates a new key for SSHing into your ec2 instance.
#  
# run this from the ./deploy directory
#
# -f specifies the file to place the keys in
# -q just quiets the output so you don't show it on stream
# -P "" provides an empty string for the password  
ssh-keygen -f ./keys/nufood_ec2 -q -P ""

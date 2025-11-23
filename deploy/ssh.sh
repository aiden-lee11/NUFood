!#/bin/bash

## ssh into ec2 instance created by terraform 

# for documentation:
# 	terraform output
#		 https://developer.hashicorp.com/terraform/cli/commands/output 
#		 --> see main.tf --> output "instance_ip"
#	 	 also: `terraform output --help`
# 	`man jq`
# 	`man tr`
# 	`man ssh`

# 1. grab the instance IP address from terraform
#
# 2. pipe to jq to get only its value as a string
# 
# 3. pipe to tr -d '"" to remove the quotes from the string
#
export EC2_IP=$(terraform output -json | jq .instance_ip.value | tr -d '"' )

# use the identity file generated earlier by ./keygen.sh to ssh into ubuntu@<ip_address> 
ssh -i ./keys/nufood_ec2 ubuntu@$EC2_IP

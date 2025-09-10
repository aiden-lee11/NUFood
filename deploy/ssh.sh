!#/bin/bash
# grab the instance IP address from terraform
#
# pipe to jq to get only its value as a string
# 
# use tr -d '"" to remove the quotes from the string
export IP=$(terraform output -json | jq .instance_ip.value | tr -d '"' )

# ssh using the identity file generated earlier and ubuntu@<ip_address> 
ssh -i ./keys/nufood_ec2 ubuntu@$IP


Whaddup Aiden


do this.


1. install terraform

2. `cd deploy`

3. `terraform init`

4. Make AWS account

5. Add AWS info to .bashrc like this:
    `export AWS_ACCESS_KEY_ID=<key_id>
     export AWS_SECRET_ACCESS_KEY=<key>
     export AWS_DEFAULT_REGION=us-west-2
     export AWS_REGION=us-west-2`

6. Make keygen script executable 
    `chmod +x ./keygen.sh`

7. Generate key pair
     `./keygen.sh`

8. `terraform apply`

9. Make ssh script executable
    `chmod +x ./ssh.sh`

10. ssh into new instance
    `./ssh.sh`

11. Have fun

12. Destory everything
    `terraform destory`










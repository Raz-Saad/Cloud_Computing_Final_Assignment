# Social Network User System
## Overview
This project implements the foundational user system for a social network. The system includes APIs for creating, retrieving, and deleting users, as well as uploading profile pictures securely. The project is built using AWS services such as Lambda, CDK, API Gateway, S3, and DynamoDB.

## Features
* <b>Create User</b>: API to create a new user and store the user information in a DynamoDB table with a unique user ID.
* <b>Delete User</b>: API to delete a user by ID.
* <b>Get User</b>: API to retrieve a user by ID.
* <b>Upload Profile Picture</b>: Securely upload a profile picture for a user using a pre-signed URL.

## Technologies Used
* AWS Lambda
* AWS CDK
* AWS API Gateway
* AWS S3
* AWS DynamoDB
* Node.js
* Axios
  
## Setup
### Prerequisites
* Node.js and npm installed
* AWS CLI configured with appropriate credentials
* AWS CDK installed globally (npm install -g aws-cdk)

#### Install AWS CLI
```bash
# Download the AWS CLI 
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" 
# Unzip the package
unzip awscliv2.zip 
# Install the AWS CLI
sudo ./aws/install 
# Clean up the installation files 
rm -rf awscliv2.zip aws
``` 
#### Set your Credentials

Inside `Launch AWS Academy Learner Lab` section go to `AWS Details`
and then click on `show` close to the `AWS CLI`.
copy the credentials.
and write `nano ~/.aws/credentials`
then paste the credentials.
for verification, just write`aws s3 ls` 
and make sure that you see some s3 bucket from you account. 

#### Install AWS CDK 
```bash
# Install Typescript
npm -g install typescript

# Install CDK
npm install -g aws-cdk

# Verify that CDK Is installed
cdk --version
```
### Bootstrap your account for CDK

> Note that: If you already bootstrap your account, no need to execute that action
```bash
# Go to CDK Directory
cd restaurants-cdk

# Install NPM models
npm install

# Run bootsrap
cdk bootstrap --template bootstrap-template.yaml
```

### Deploy the Base Stack
Make sure that you are at folder `SocialNetwork-cdk`
Change the Account ID and the VPC ID for your own details,
you can find all the places easily when searching `Students TODO Account Details`
```bash
cdk deploy
```

## How to run tests:
### installation
* npm install --save-dev jest
* npm install axios
### Test command
* chmod +x runTests.sh && ./runTests.sh
* OLD - npx jest api.test.js

## Create a package for lambda function
* npm init -y
* npm install aws-sdk

## How to upload an image via CMD using curl
```bash
curl -X PUT -T "file path" "pre-signed URL"
```

## Running HTML pages locally
* first download http-server
```bash
npm install -g http-server
```
* Then run the following command
```bash
http-server -p 8000 --cors -c-1
```


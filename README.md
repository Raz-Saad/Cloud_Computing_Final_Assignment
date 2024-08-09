# Social Network User System
## Overview
This project implements the foundational user system for a social network. The system includes APIs for creating, retrieving, and deleting users, as well as uploading profile pictures securely. The project is built using AWS services such as Lambda, CDK, API Gateway, S3, and DynamoDB.

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


# Part A: Build a basic user system
## Features
### Registration
A Lambda function that receives a username, email, password, and full name, then creates a user in the DynamoDB user’s table with the hashed password. <br>
* API Endpoint: /register
* Method: POST
* Payload:
  ```bash
  {
    "username": "user123",
    "email": "user@example.com",
    "password": "password123",
    "fullName": "User Fullname"
  }
  ```
### Get User By ID
A Lambda function that retrieves user information by username from the DynamoDB user’s table.
* API Endpoint: 
* Method: GET
* Response:
  ```bash
  {
    "username": "user123",
    "email": "user@example.com",
    "fullName": "User Fullname",
    "validProfilePicture": true
  }
  ```

### Delete User By ID
A Lambda function that deletes a user by username from the DynamoDB user’s table.
* API Endpoint: 
* Method: DELETE

### Get Pre-signed URL for Uploading Profile Image
A Lambda function that generates and returns a PUT pre-signed URL for uploading a profile image into the S3 bucket named "ImageStorage".
* API Endpoint: 
* Method: GET
* Response:
  ```bash
  {
    "preSignedUrl": "https://s3.amazonaws.com/ImageStorage/..."
  }
  ```

### Update DB Profile Picture
A Lambda function that gets triggered when an image is uploaded to the "ImageStorage" S3 bucket, then updates the DynamoDB user’s table with a valid profile picture flag and the URL to the image in the bucket.

## Technologies Used
* AWS Lambda
* AWS CDK
* AWS API Gateway
* AWS S3
* AWS DynamoDB
* Node.js
* Axios
  
# Part B: Innovative Feature
## Overview
In this part, an innovative feature for our social network is implemented that allows users to upload posts by submitting images.<br>
Amazon Textract is utilized to extract text from the uploaded images, allowing users to edit the extracted text before finalizing and uploading the post.<br>
This feature includes multiple Lambda functions, an SQS queue, and a DynamoDB table to manage the posts.

## Features
### Get Pre-signed URL for Uploading Post Image
A Lambda function that generates and returns a PUT pre-signed URL for uploading an image into the posts S3 bucket.
* API Endpoint:
* Method: GET
* Response:
  ```bash
  {
  "preSignedUrl": "https://s3.amazonaws.com/PostImages/..."
  }
  ```

### Get Pre-signed URL for Viewing Profile Image
A Lambda function that generates and returns a GET pre-signed URL for viewing the user's profile picture.
* API Endpoint:
* Method: GET
* Response:
  ```bash
  {
  "preSignedUrl": "https://s3.amazonaws.com/ImageStorage/..."
  }
  ```
### Get All Done Posts
A Lambda function that returns all posts with the status 'done'.
* API Endpoint:
* Method: GET
* Response:
  ```bash
    [
      {
        "postId": "12345",
        "username": "user123",
        "content": "Extracted and edited content",
        "status": "done"
      },
      ...
    ]
  ```

### Delete Post
A Lambda function that deletes a post by post ID from the DynamoDB posts table.
* API Endpoint:
* Method: DELETE

### Get Staging and Error Posts
A Lambda function that returns all posts with the status 'staging' or 'error' for a specific user.
* API Endpoint:
* Method: GET
* Response:
  ```bash
    [
      {
        "postId": "12345",
        "username": "user123",
        "content": "Extracted content",
        "status": "staging"
      },
      ...
    ]
  ```

### Upload Post By Image After Edit
A Lambda function that updates the content of a post by post ID and changes the status to 'done' in the DynamoDB posts table.
* API Endpoint:
* Method: POST
* Payload:
  ```bash
    {
      "postid": "123123"
      "content": "Edited content"
    }
  ```

### Upload Text Post
A Lambda function that creates a new text post in the DynamoDB posts table.
* API Endpoint:
* Method: POST
* Payload:
  ```bash
    {
      "username": "user123",
      "content": "This is a text post"
    }
  ```

### User Login
A Lambda function that checks whether the provided username and password are correct.
* API Endpoint:
* Method: POST
* Payload:
  ```bash
    {
      "username": "user123",
      "password": "password123"
    }
  ```

### Textract Image
A Lambda function triggered by an SQS event to use Amazon Textract to extract text from an image and send the result to another SQS queue.
*  <b>Trigger</b>: SQS

### Store Post From SQS to DB
A Lambda function triggered by an SQS event with the extracted text to create a new record in the DynamoDB posts table.
*  <b>Trigger</b>: SQS

### Empty Bucket
A Lambda function to empty S3 buckets – only for destroy purposes.

## Technologies Used
* Amazon Textract
* AWS SQS
* AWS Lambda
* AWS CDK
* AWS API Gateway
* AWS S3
* AWS DynamoDB
* Node.js

## How to run tests:
### installation
* npm install --save-dev jest
* npm install axios
  
### Test command
* chmod +x runTests.sh && ./runTests.sh
* 
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


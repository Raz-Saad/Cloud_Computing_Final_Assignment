# Social Network User System
## Overview
This project comprises two main parts, each implementing essential features for a social network. The system is built using AWS services such as Lambda, CDK, API Gateway, S3, DynamoDB, Textract, and SQS.<br>
The primary objectives are to establish a foundational user system and introduce an innovative feature for post creation through image uploads and text extraction.

## Setup
### Prerequisites
* Node.js and npm installed
* AWS CLI configured with appropriate credentials
* AWS CDK installed globally
  
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
cd SocialNetwork-cdk

# Install NPM models
npm install

# Run bootsrap
cdk bootstrap --template bootstrap-template.yaml
```

### Deploy the Base Stack
Make sure that you are at folder `SocialNetwork-cdk`
Change the Account ID and the VPC ID for your own details,
you can find all the places easily when searching `TODO Account Details` (in lib and bin folders)
```bash
cdk deploy
```


# Part A: Build a basic user system
## Overview
In this part we implement the foundational user system for a social network. The system includes APIs for creating, retrieving, and deleting users, as well as uploading profile pictures securely. The project is built using AWS services such as Lambda, CDK, API Gateway, S3, and DynamoDB.

## Lambdas
### Registration
A Lambda function that receives a username, email, password, and full name, then creates a user in the DynamoDB user’s table with the hashed password. <br>
* API Endpoint: /registration
* Method: POST
* Request:
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
* API Endpoint: /getUser 
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
* API Endpoint: /deleteUser
* Method: DELETE

### Get Pre-signed URL for Uploading Profile Image
A Lambda function that generates and returns a PUT pre-signed URL for uploading a profile image into the S3 bucket named "ImageStorage".
* API Endpoint: /getPresignUrlForUplodingProfileImage
* Method: GET
* Response:
  ```bash
  {
    "uploadUrl": "https://s3.amazonaws.com/ImageStorage/..."
  }
  ```

### Update DB Profile Picture
A Lambda function that gets triggered when an image is uploaded to the "ImageStorage" S3 bucket, then updates the DynamoDB user’s table with a valid profile picture flag and the URL to the image in the bucket.
*  <b>Triggered by</b>: S3 Bucket

## Technologies Used
* AWS Lambda
* AWS CDK
* AWS API Gateway
* AWS S3
* AWS DynamoDB
* Node.js
* Axios

## How to run tests:
<b>Navigate to Tests folder</b>
```bash
cd Tests
```
### installation
* npm install --save-dev jest
* npm install axios
  
### Test command
* chmod +x runTests.sh && ./runTests.sh

## Diagram - Upload User Profile Picture

![Diagram Part A -  Upload User Profile Picture](https://github.com/user-attachments/assets/9fce362f-c900-485d-bcbd-74a40724c8d4)


# Part B: Innovative Feature
## Overview
In this part, an innovative feature for our social network is implemented that allows users to upload posts by submitting images.<br>
Amazon Textract is utilized to extract text from the uploaded images, allowing users to edit the extracted text before finalizing and uploading the post.<br>
This feature includes multiple Lambda functions, SQS queues, and a DynamoDB table to manage the posts.

## Lambdas
### Get Pre-signed URL for Uploading Post Image
A Lambda function that generates and returns a PUT pre-signed URL for uploading an image into the posts S3 bucket.
* API Endpoint: /getPresignUrlForUplodingPostImage
* Method: GET
* Response:
  ```bash
  {
    "uploadUrl": "https://s3.amazonaws.com/PostImages/..."
  }
  ```

### Get Pre-signed URL for Viewing Profile Image
A Lambda function that generates and returns a GET pre-signed URL for viewing the user's profile picture.
* API Endpoint: /getPresignUrlForViewingProfileImage
* Method: GET
* Response:
  ```bash
  {
    "uploadUrl": "https://s3.amazonaws.com/ImageStorage/..."
  }
  ```
### Get All Done Posts
A Lambda function that returns all posts with the status 'done'.
* API Endpoint: /getAllDonePosts
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
* API Endpoint: /deletePost
* Method: DELETE

### Get Staging and Error Posts
A Lambda function that returns all posts with the status 'staging' or 'error' for a specific user.
* API Endpoint: /getStagingAndErrorPosts
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
* API Endpoint: /uploadPostByImageAfterEdit
* Method: POST
* Request:
  ```bash
    {
      "postid": "123123"
      "content": "Edited content"
    }
  ```

### Upload Text Post
A Lambda function that creates a new text post in the DynamoDB posts table.
* API Endpoint: /uploadTextPost
* Method: POST
* Request:
  ```bash
    {
      "username": "user123",
      "content": "This is a text post"
    }
  ```

### User Login
A Lambda function that checks whether the provided username and password are correct.
* API Endpoint: /login
* Method: POST
* Request:
  ```bash
    {
      "username": "user123",
      "password": "password123"
    }
  ```

### Textract Image
A Lambda function triggered by an SQS event to use Amazon Textract to extract text from an image and send the result to another SQS queue.
*  <b>Triggered by</b>: SQS

### Store Post From SQS to DB
A Lambda function triggered by an SQS event with the extracted text to create a new record in the DynamoDB posts table.
*  <b>Triggered by</b>: SQS

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
## Diagram - Upload A Post By An Image
![Diagram Part B -  Upload A Post By An Image](https://github.com/user-attachments/assets/f03623ce-76ba-414e-b9d3-840842712de4)

### Running HTML pages locally
<b>Navigate to Client-Side folder</b>
```bash
cd Client-Side
```
* first download http-server
```bash
npm install -g http-server
```
* After you deployed the stack, you need to update in every html page the variable "baseURL" with updated apigateway URL (you see this after the deployment is done)
  ![image](https://github.com/user-attachments/assets/abf47f4c-d79b-454d-8846-c1ae65be3ec5)

* Then run the following command
```bash
http-server -p 8000 --cors -c-1
```
## Demo
### Login page
![login](https://github.com/user-attachments/assets/8da37b0c-5e7a-41b6-95d7-e9ed460b9592)

### Register page
![register](https://github.com/user-attachments/assets/60575c7f-398b-4b17-82f5-a3a00be5021e)

### Profile page
![profile](https://github.com/user-attachments/assets/d3fa84df-2904-4674-8a87-a2168012208b)

### Homepage page
![homepage](https://github.com/user-attachments/assets/7e4825b5-a300-47aa-b28d-edbf5edcf588)

### Uploading Posts page
![upload a post](https://github.com/user-attachments/assets/96c77f3c-b37b-4357-85c9-b7b4f486a907)
![upload a post - edit](https://github.com/user-attachments/assets/cb00ae73-909a-459b-966c-0d31af733786)

## Notes:
### How to create a package for lambda function
```bash
npm init -y
npm install aws-sdk
```


### How to upload an image via CMD using curl
```bash
curl -X PUT -T "file path" "pre-signed URL"
```




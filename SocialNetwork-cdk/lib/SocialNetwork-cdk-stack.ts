import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export class SocialNetworkCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Replace with your account ID and role ARN
    const labRole = iam.Role.fromRoleArn(this, 'Role', "arn:aws:iam::361602391862:role/LabRole", { mutable: false });

    // TODO: Replace with your existing VPC ID
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-05fc44f3c7d685edb',
    });

    // Create VPC
    // const vpc = new ec2.Vpc(this, 'VPC', {
    //   cidr: '10.0.0.0/16',
    //   maxAzs: 2,
    //   subnetConfiguration: [
    //     {
    //       subnetType: ec2.SubnetType.PUBLIC,
    //       name: 'Public',
    //       cidrMask: 24,
    //     },
    //     {
    //       subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    //       name: 'Private',
    //       cidrMask: 24,
    //     },
    //   ],
    //   natGateways: 0,
    // });

    this.createNatGatewayForPrivateSubnet(vpc);

    //creating a Dynamo DB Table for storing user's data
    const table = this.createDynamoDBTable();

    // create an S3 bucket for storing user's profile picture
    const profileImageBucket = this.createBucket('ImageStorage',labRole);

    // create an S3 bucket for storing user's images posts for further process
    const postsBucket = this.createBucket('PostsStorage',labRole);

    // create a sqs queue that stores and pass s3 PUT event - user upload image to text for posting
    const sqsQueueImageUpload = this.createSQSQueue('ImageUploadQueue');

    // create a sqs queue that stores and pass the results of extracting text from an image using Textract
    const sqsQueueTextractResult = this.createSQSQueue('TextractResultQueue');

    // creating lambdas functions
    const registrationFunction = this.createLambdaFunction('RegistrationFunction', 'lambdas/registration', labRole, table, vpc, profileImageBucket);
    const getUserFunction = this.createLambdaFunction('GetUserFunction', 'lambdas/getUserById', labRole, table, vpc, profileImageBucket);
    const deleteUserFunction = this.createLambdaFunction('DeleteUserFunction', 'lambdas/deleteUserById', labRole, table, vpc, profileImageBucket);
    const getPresignUrlForUplodingProfileImageFunction = this.createLambdaFunction('GetPresignUrlForUplodingProfileImage', 'lambdas/getPresignUrlForUplodingProfileImage', labRole, table, vpc, profileImageBucket);
    const getPresignUrlForUplodingPostImageFunction = this.createLambdaFunction('GetPresignUrlForUplodingPostImage', 'lambdas/getPresignUrlForUplodingPostImage', labRole, table, vpc, postsBucket);

    // create an api gateway
    const api = new apigateway.RestApi(this, 'SocialNetworkApi', {
      restApiName: 'Social Network Service',
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: 'SocialNetworkApiUrl',
    });

    // creating API endpoints
    const registration = api.root.addResource('registration');
    registration.addMethod('POST', new apigateway.LambdaIntegration(registrationFunction));

    const getUser = api.root.addResource('getUser');
    getUser.addMethod('GET', new apigateway.LambdaIntegration(getUserFunction));

    const deleteUser = api.root.addResource('deleteUser');
    deleteUser.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserFunction));

    const getPresignUrlForUplodingProfileImage = api.root.addResource('getPresignUrlForUplodingProfileImage');
    getPresignUrlForUplodingProfileImage.addMethod('GET', new apigateway.LambdaIntegration(getPresignUrlForUplodingProfileImageFunction));

    const getPresignUrlForUplodingPostImage = api.root.addResource('getPresignUrlForUplodingPostImage');
    getPresignUrlForUplodingPostImage.addMethod('GET', new apigateway.LambdaIntegration(getPresignUrlForUplodingPostImageFunction));

    // Lambda function that gets called with a trigger
    const updateProfilePictureFunction = this.createUpdateProfilePictureFunction(labRole, table, profileImageBucket , vpc);
    this.setupS3TriggerToLambda(profileImageBucket, updateProfilePictureFunction);
    
    // create lambda for extract text from an image and pass the result to sqs called: sqsQueueTextractResult
    this.createTextractLambda('TextractFunction', labRole , postsBucket, sqsQueueImageUpload, sqsQueueTextractResult);
    // Add bucket notification to trigger SQS queue
    this.setupS3TriggerToSQS(postsBucket, sqsQueueImageUpload);

    
    // Add the policy to the SQS queue
    this.addS3SendMessagePolicyToQueue(sqsQueueImageUpload, postsBucket.bucketArn);
    //const updateDb = this.createUpdateDBLambda('UpdateDBFunction', sqsQueue2);


    
  }

  private createNatGatewayForPrivateSubnet(vpc: ec2.IVpc) {
    // Create elastic IP for NAT Gateway
    const cfnEip = new ec2.CfnEIP(this, 'MyCfnEIP', {
      domain: 'vpc',
    });

    // Create NAT Gateway in the public subnet
    const cfnNatGateway = new ec2.CfnNatGateway(this, 'MyCfnNatGateway', {
      subnetId: vpc.publicSubnets[0].subnetId,
      allocationId: cfnEip.attrAllocationId,
    });

    // Modify the private route table to use NAT Gateway for internet access
    vpc.privateSubnets.forEach((subnet, index) => {
      const routeTable = new ec2.CfnRouteTable(this, `PrivateRouteTable${index}`, {
        vpcId: vpc.vpcId,
      });

      new ec2.CfnRoute(this, `PrivateRoute${index}`, {
        routeTableId: routeTable.ref,
        destinationCidrBlock: '0.0.0.0/0',
        natGatewayId: cfnNatGateway.ref,
      });

      new ec2.CfnSubnetRouteTableAssociation(this, `SubnetRouteTableAssociation${index}`, {
        routeTableId: routeTable.ref,
        subnetId: subnet.subnetId,
      });
    });
  }

  private createBucket(bucketname: string,labRole: iam.IRole) {
    // Create image storage bucket
    const bucket = new s3.Bucket(this, bucketname, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      notificationsHandlerRole: labRole
    });

    // Add policy to the bucket
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [
          bucket.arnForObjects("*"), 
          bucket.bucketArn,
        ],
        actions: ["s3:List*", "s3:Get*", "s3:PutObject", "s3:DeleteObject"],
        principals: [new iam.ArnPrincipal("arn:aws:iam::361602391862:role/LabRole")]
      })
    );

    //Output bucket name
    new cdk.CfnOutput(this, `${bucketname}Output`, {
      value: bucket.bucketName,
    });

    return bucket;
  }

  private createSQSQueue(queueName: string): sqs.Queue {
    const queue = new sqs.Queue(this, queueName, {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    return queue;
  }


  private createDynamoDBTable() {
    // Create DynamoDB table
    const table = new dynamodb.Table(this, 'Users', {
      partitionKey: { name: 'UserName', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1, 
      writeCapacity: 1,
    });

    // Output table name
    // new cdk.CfnOutput(this, 'TableName', {
    //   value: table.tableName,
    // });

    return table;
  }

  private createLambdaFunction(id: string, path: string, labRole: iam.IRole, table: dynamodb.Table , vpc: cdk.aws_ec2.IVpc , Bucket: s3.Bucket) {
    // Grant permissions to Lambda function
    table.grantReadWriteData(labRole);
    Bucket.grantReadWrite(labRole); // Grant permissions to the bucket
    
    // Create Lambda function
      return new lambda.Function(this, id, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path),
      role: labRole,
      environment: {
        TABLE_NAME: table.tableName,
        IMAGE_BUCKET_NAME: Bucket.bucketName,
      },
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
    });

    }

    // lambda for updating DB with user's profile picture
    private createUpdateProfilePictureFunction(labRole: iam.IRole, table: dynamodb.Table, Bucket: s3.Bucket , vpc: cdk.aws_ec2.IVpc) {
      // Grant permissions to Lambda function
      table.grantReadWriteData(labRole);
      Bucket.grantRead(labRole); // Grant read permissions to the bucket
  
      // Create Lambda function
      return new lambda.Function(this, 'UpdateProfilePictureFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('lambdas/updateProfilePicture'),
        role: labRole,
        environment: {
          TABLE_NAME: table.tableName,
          IMAGE_BUCKET_NAME: Bucket.bucketName,
        },
        vpc: vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
      });
    }
    
    // trigger for s3 that triggers lambda function
    private setupS3TriggerToLambda(bucket: s3.Bucket, lambdaFunction: lambda.IFunction) {
      // Add S3 event notification to trigger the Lambda function
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.LambdaDestination(lambdaFunction)
      );
    }

    private setupS3TriggerToSQS(bucket: s3.Bucket, queue: sqs.Queue) {
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.SqsDestination(queue)
      );
    }


    private createTextractLambda(functionName: string, labRole: iam.IRole, bucket: s3.Bucket, sqsQueueImageUpload: sqs.Queue, sqsQueueTextractResult: sqs.Queue) {
      bucket.grantRead(labRole); // Grant read permissions to the bucket
      
      const textractLambda = new lambda.Function(this, functionName, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'textract.handler',
        code: lambda.Code.fromAsset('lambdas/textractImage'),
        role: labRole,
        environment: {
          BUCKET_NAME: bucket.bucketName,
          OUTPUT_QUEUE_URL: sqsQueueTextractResult.queueUrl,
        },
      });
  
      bucket.grantRead(textractLambda);
      sqsQueueImageUpload.grantConsumeMessages(textractLambda);
      sqsQueueTextractResult.grantSendMessages(textractLambda);
  
      textractLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: ['textract:*'],
        resources: ['*'],
      }));
  
      textractLambda.addEventSource(new lambdaEventSources.SqsEventSource(sqsQueueImageUpload));
  
      //bucket.addEventNotification(s3.EventType.OBJECT_CREATED_PUT, new s3n.SqsDestination(sqsQueueImageUpload));
    }
  

    private addS3SendMessagePolicyToQueue(queue: sqs.Queue, bucketArn: string) {
      // Add policy to SQS queue to allow S3 to send messages
      const policy = new sqs.CfnQueuePolicy(this, 'S3SendMessagePolicy', {
        queues: [queue.queueUrl],
        policyDocument: {
          Version: "2012-10-17",
          Id: `${queue.queueArn}/SQSDefaultPolicy`,
          Statement: [
            {
              Sid: "example-statement-ID",
              Effect: "Allow",
              Principal: {
                AWS: "*"
              },
              Action: "SQS:SendMessage",
              Resource: queue.queueArn,
              Condition: {
                ArnLike: {
                  "aws:SourceArn": bucketArn
                }
              }
            }
          ]
        }
      });
    }



  }
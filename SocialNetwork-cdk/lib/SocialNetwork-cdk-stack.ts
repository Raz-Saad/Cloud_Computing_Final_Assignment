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
import * as cr from 'aws-cdk-lib/custom-resources';

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
    const usersTable = this.createDynamoDBTable();
    //creating a Dynamo DB Table for storing Posts data
    const postsTable = this.createPostsTable();

    // create an S3 bucket for storing user's profile picture
    const profileImageBucket = this.createBucket('ImageStorage', labRole);

    // create an S3 bucket for storing user's images posts for further process
    const postsBucket = this.createBucket('PostsStorage', labRole);

    // creates a Lambda function that empties an S3 bucket by deleting all objects within it
    const emptyBucketFunction = this.createEmptyBucketLambda(labRole);
    //assign emptyBucketFunction to the buckets
    this.createCustomResource(emptyBucketFunction, profileImageBucket, labRole);
    this.createCustomResource(emptyBucketFunction, postsBucket, labRole);

    // create a sqs queue that stores and pass s3 PUT event - user upload image to text for posting
    const sqsQueueImageUpload = this.createSQSQueue('ImageUploadQueue');

    // create a sqs queue that stores and pass the results of extracting text from an image using Textract
    const sqsQueueTextractResult = this.createSQSQueue('TextractResultQueue');

    // creating lambdas functions
    const registrationFunction = this.createApiLambdaFunction('RegistrationFunction', 'lambdas/registration', labRole, usersTable, vpc, profileImageBucket);
    const getUserFunction = this.createApiLambdaFunction('GetUserByIdFunction', 'lambdas/getUserById', labRole, usersTable, vpc, profileImageBucket);
    const deleteUserFunction = this.createApiLambdaFunction('DeleteUserByIdFunction', 'lambdas/deleteUserById', labRole, usersTable, vpc, profileImageBucket);
    const getPresignUrlForUplodingProfileImageFunction = this.createApiLambdaFunction('GetPresignUrlForUplodingProfileImage', 'lambdas/getPresignUrlForUplodingProfileImage', labRole, usersTable, vpc, profileImageBucket);
    const getPresignUrlForUplodingPostImageFunction = this.createApiLambdaFunction('GetPresignUrlForUplodingPostImage', 'lambdas/getPresignUrlForUplodingPostImage', labRole, usersTable, vpc, postsBucket);
    const userLoginFunction = this.createApiLambdaFunction('UserLoginFunction', 'lambdas/userLogin', labRole, usersTable, vpc, profileImageBucket);
    const getPresignUrlForViewingProfileImageFunction = this.createApiLambdaFunction('GetPresignUrlForViewingProfileImage', 'lambdas/getPresignUrlForViewingProfileImage', labRole, usersTable, vpc, profileImageBucket);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'SocialNetworkApi', {
      restApiName: 'Social Network Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: 'SocialNetworkApiUrl',
    });

    // creating API endpoints
    const registration = api.root.addResource('registration');
    registration.addMethod('POST', new apigateway.LambdaIntegration(registrationFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    const getUser = api.root.addResource('getUser');
    getUser.addMethod('GET', new apigateway.LambdaIntegration(getUserFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    const deleteUser = api.root.addResource('deleteUser');
    deleteUser.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    const getPresignUrlForUplodingProfileImage = api.root.addResource('getPresignUrlForUplodingProfileImage');
    getPresignUrlForUplodingProfileImage.addMethod('GET', new apigateway.LambdaIntegration(getPresignUrlForUplodingProfileImageFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    const getPresignUrlForUplodingPostImage = api.root.addResource('getPresignUrlForUplodingPostImage');
    getPresignUrlForUplodingPostImage.addMethod('GET', new apigateway.LambdaIntegration(getPresignUrlForUplodingPostImageFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    const userLogin = api.root.addResource('login');
    userLogin.addMethod('POST', new apigateway.LambdaIntegration(userLoginFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    const getPresignUrlForViewingProfileImage = api.root.addResource('getPresignUrlForViewingProfileImage');
    getPresignUrlForViewingProfileImage.addMethod('GET', new apigateway.LambdaIntegration(getPresignUrlForViewingProfileImageFunction), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    });

    // Lambda function that gets called with a trigger
    const updateDBProfilePictureFunction = this.createupdateDBProfilePictureFunction(labRole, usersTable, profileImageBucket, vpc);
    this.setupS3TriggerToLambda(profileImageBucket, updateDBProfilePictureFunction);

    // create lambda for extract text from an image and pass the result to sqs called: sqsQueueTextractResult
    this.createTextractLambda('TextractFunction', labRole, postsBucket, sqsQueueImageUpload, sqsQueueTextractResult);

    // create lambda for inserting data coming from SQS (TextractLambda) to postsTable DB
    this.createTextractResultLambda('StorePostFromSQStoDb', labRole, sqsQueueTextractResult, postsTable);

    // Add bucket notification to trigger SQS queue
    this.setupS3TriggerToSQS(postsBucket, sqsQueueImageUpload);

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

  private createBucket(bucketname: string, labRole: iam.IRole) {
    // Create image storage bucket with CORS configuration
    const bucket = new s3.Bucket(this, bucketname, {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        notificationsHandlerRole: labRole,
        cors: [
            {
                allowedHeaders: ["*"],
                allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                allowedOrigins: ["*"], // Allow all origins
                exposedHeaders: []
            }
        ]
    });

    // Add policy to the bucket
    bucket.addToResourcePolicy(
        new iam.PolicyStatement({
            actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
            resources: [
                bucket.bucketArn,
                bucket.arnForObjects("*"),
            ],
            principals: [new iam.ArnPrincipal(labRole.roleArn)]
        })
    );

    // Output bucket name
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

  private createPostsTable() {
    const postsTable = new dynamodb.Table(this, 'Posts', {
      partitionKey: { name: 'PostID', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    postsTable.addGlobalSecondaryIndex({
      indexName: 'UsernameIndex',
      partitionKey: { name: 'Username', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
      readCapacity: 1,
      writeCapacity: 1,
    });

    postsTable.addGlobalSecondaryIndex({
      indexName: 'StagingIndex',
      partitionKey: { name: 'Staging', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
      readCapacity: 1,
      writeCapacity: 1,
    });

    postsTable.addGlobalSecondaryIndex({
      indexName: 'UsernameStagingIndex',
      partitionKey: { name: 'Username', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Staging', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
      readCapacity: 1,
      writeCapacity: 1,
    });

    return postsTable;
  }

  private createApiLambdaFunction(id: string, path: string, labRole: iam.IRole, table: dynamodb.Table, vpc: cdk.aws_ec2.IVpc, Bucket: s3.Bucket) {
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
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

  }

  // lambda for updating DB with user's profile picture
  private createupdateDBProfilePictureFunction(labRole: iam.IRole, table: dynamodb.Table, Bucket: s3.Bucket, vpc: cdk.aws_ec2.IVpc) {
    // Grant permissions to Lambda function
    table.grantReadWriteData(labRole);
    Bucket.grantRead(labRole); // Grant read permissions to the bucket

    // Create Lambda function
    return new lambda.Function(this, 'updateDBProfilePictureFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/updateDBProfilePicture'),
      role: labRole,
      environment: {
        TABLE_NAME: table.tableName,
        IMAGE_BUCKET_NAME: Bucket.bucketName,
      },
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
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

  // trigger for s3 that triggers SQS
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
      handler: 'index.handler',
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
  }


  private createTextractResultLambda(functionName: string, labRole: iam.IRole, sqsQueueTextractResult: sqs.IQueue, postsTable: dynamodb.Table) {

    const textractResultLambda = new lambda.Function(this, functionName, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/storePostFromSQStoDb'),
      role: labRole,
      environment: {
        POSTS_TABLE_NAME: postsTable.tableName,
      },
    });

    sqsQueueTextractResult.grantConsumeMessages(textractResultLambda);
    postsTable.grantWriteData(textractResultLambda);
    textractResultLambda.addEventSource(new lambdaEventSources.SqsEventSource(sqsQueueTextractResult));
  }

  //Creates a Lambda function that empties an S3 bucket by deleting all objects within it
  private createEmptyBucketLambda(labRole: iam.IRole) {
    // Create Lambda function
    return new lambda.Function(this, 'EmptyBucketFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/emptyBucket'),
      role: labRole,
      timeout: cdk.Duration.minutes(5),
    });
  }

  //Creates a custom resource that invokes the empty bucket Lambda function
  private createCustomResource(emptyBucketFunction: lambda.Function, bucket: s3.Bucket, labRole: iam.IRole): void {
    // Use a unique and static ID for the Provider
    const providerId = `EmptyBucketResourceProvider-${bucket.node.id}`;
    const resourceId = `EmptyBucketResource-${bucket.node.id}`;

    const provider = new cr.Provider(this, providerId, {
      onEventHandler: emptyBucketFunction,
      role: labRole,
    });

    // Create Custom Resource with a static ID
    new cdk.CustomResource(this, resourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        BucketName: bucket.bucketName,
      },
    });

    bucket.grantReadWrite(emptyBucketFunction);
  }


}
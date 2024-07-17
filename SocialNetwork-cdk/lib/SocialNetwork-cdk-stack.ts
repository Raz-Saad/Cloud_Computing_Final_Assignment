import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class SocialNetworkCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Replace with your account ID and role ARN
    const labRole = iam.Role.fromRoleArn(this, 'Role', "arn:aws:iam::361602391862:role/LabRole", { mutable: false });

    // TODO: Replace with your existing VPC ID
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-08c17e89eddc8e4da',
    });

    this.createNatGatewayForPrivateSubnet(vpc);

    const table = this.createDynamoDBTable();

    // Create an S3 bucket
    //const deploymentBucket = this.deployTheApplicationArtifactToS3Bucket(labRole);
    const imageBucket = this.createImageStorageBucket();

    const registrationFunction = this.createLambdaFunction('RegistrationFunction', 'lambdas/registration', labRole, table, vpc);
    const getUserFunction = this.createLambdaFunction('GetUserFunction', 'lambdas/getUserById', labRole, table, vpc);
    const deleteUserFunction = this.createLambdaFunction('DeleteUserFunction', 'lambdas/deleteUserById', labRole, table, vpc);

    const api = new apigateway.RestApi(this, 'SocialNetworkApi', {
      restApiName: 'Social Network Service',
    });

    // Creating API endpoints
    const registration = api.root.addResource('registration');
    registration.addMethod('POST', new apigateway.LambdaIntegration(registrationFunction));

    const getUser = api.root.addResource('getUser');
    getUser.addMethod('GET', new apigateway.LambdaIntegration(getUserFunction));

    const deleteUser = api.root.addResource('deleteUser');
    deleteUser.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserFunction));

    // Output for testing purposes
    new cdk.CfnOutput(this, 'Run Test Command', {
      value: `TABLE_NAME='${table.tableName}' AWS_REGION='${this.region}' npm test`,
    });
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

  // private deployTheApplicationArtifactToS3Bucket(labRole: iam.IRole) {
  //   // Create deployment bucket
  //   const bucket = new s3.Bucket(this, 'DeploymentArtifact', {
  //     removalPolicy: cdk.RemovalPolicy.RETAIN,
  //   });

  //   // Deploy website content to S3 bucket
  //   new s3Deployment.BucketDeployment(this, 'DeployWebsite', {
  //     sources: [s3Deployment.Source.asset('./../service-files', {
  //       exclude: ['node_modules', '*.test.js'],
  //     })],
  //     destinationBucket: bucket,
  //     role: labRole,
  //   });

  //   // Output bucket name
  //   new cdk.CfnOutput(this, 'BucketName', {
  //     value: bucket.bucketName,
  //   });

  //   return bucket;
  // }

  private createImageStorageBucket() {
    // Create image storage bucket
    const bucket = new s3.Bucket(this, 'ImageStorage', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Output bucket name
    new cdk.CfnOutput(this, 'ImageBucketName', {
      value: bucket.bucketName,
    });

    return bucket;
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
    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
    });

    return table;
  }

  private createLambdaFunction(id: string, path: string, labRole: iam.IRole, table: dynamodb.Table , vpc: cdk.aws_ec2.IVpc) {
    // Grant permissions to Lambda function
    table.grantReadWriteData(labRole);

    // Create Lambda function
    return new lambda.Function(this, id, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path),
      role: labRole,
      environment: {
        TABLE_NAME: table.tableName,
      },
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
    });
  }
}

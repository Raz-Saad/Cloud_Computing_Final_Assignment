#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RestaurantsCdkStack } from '../lib/restaurants-cdk-stack';

import { DefaultStackSynthesizer } from 'aws-cdk-lib';


const defaultStackSynthesizer = new DefaultStackSynthesizer({
  // Name of the S3 bucket for file assets
  fileAssetsBucketName:
    "cdk-${Qualifier}-assets-${AWS::AccountId}-${AWS::Region}",
  bucketPrefix: "",

  // Name of the ECR repository for Docker image assets
  imageAssetsRepositoryName:
    "cdk-${Qualifier}-container-assets-${AWS::AccountId}-${AWS::Region}",

  // ARN of the role assumed by the CLI and Pipeline to deploy here
  deployRoleArn: "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  deployRoleExternalId: "",

  // ARN of the role used for file asset publishing (assumed from the deploy role)
  fileAssetPublishingRoleArn:
    "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  fileAssetPublishingExternalId: "",

  // ARN of the role used for Docker asset publishing (assumed from the deploy role)
  imageAssetPublishingRoleArn:
    "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  imageAssetPublishingExternalId: "",

  // ARN of the role passed to CloudFormation to execute the deployments
  cloudFormationExecutionRole:
    "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",

  // ARN of the role used to look up context information in an environment
  lookupRoleArn: "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  lookupRoleExternalId: "",

  // Name of the SSM parameter which describes the bootstrap stack version number
  bootstrapStackVersionSsmParameter: "/cdk-bootstrap/${Qualifier}/version",

  // Add a rule to every template which verifies the required bootstrap stack version
  generateBootstrapVersionRule: true,
});

const app = new cdk.App();
new RestaurantsCdkStack(app, 'RestaurantsCdkStack', {
  synthesizer: defaultStackSynthesizer,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */


  // Students TODO Account Details: change the account and region to your own
  env: { account: '079553702230', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
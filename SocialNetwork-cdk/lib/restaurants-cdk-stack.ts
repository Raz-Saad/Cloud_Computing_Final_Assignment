import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';

export class RestaurantsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const useCacheFlag = true;

    // Students TODO Account Details: Change to your account id
    const labRole = iam.Role.fromRoleArn(this, 'Role', "arn:aws:iam::079553702230:role/LabRole", { mutable: false });

    // Students TODO Account Details: Change the vpcId to the VPC ID of your existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-052733467352389cf',
    });

    this.createNatGatewayForPrivateSubnet(vpc);

    const memcachedConfigurationEndpoint = this.createMemcachedSingleInstaceInPublicSubnetForTestingPurpose(vpc, labRole);
    // Students TODO: Comment out the above line and uncomment the below line to use Elasticache, for the testing phase
    // const memcachedConfigurationEndpoint = this.createMemcachedElasticache(vpc, labRole);

    const table = this.createDynamoDBTable();

    // Create an S3 bucket
    const deploymentBucket = this.deployTheApplicationArtifactToS3Bucket(labRole);

    // create a amazon linux 2023 user data from node js app that deploy from bucket, 
    // and pass the elastic cache and dynamodb table name in env to the app
    this.deployApplicationInfrastructure(deploymentBucket, memcachedConfigurationEndpoint, table, useCacheFlag, vpc, labRole);

    new cdk.CfnOutput(this, 'Run Test Command', {
      value: `MEMCACHED_CONFIGURATION_ENDPOINT='${memcachedConfigurationEndpoint}' TABLE_NAME='${table.tableName}' AWS_REGION='${this.region}' USE_CACHE='${useCacheFlag}' npm test`,
    });

  }

  private createNatGatewayForPrivateSubnet(vpc: cdk.aws_ec2.IVpc) {
    // Note for students: This is for cost reduction purposes. you shold not change this code.

    // create elastic IP for nat gateway
    const cfnEip = new ec2.CfnEIP(this, 'MyCfnEIP', {
      domain: 'vpc',
    });

    // create nat gateway for private subnet
    const cfnNatGateway = new ec2.CfnNatGateway(this, 'MyCfnNatGateway', {
      subnetId: vpc.publicSubnets[0].subnetId,
      allocationId: cfnEip.attrAllocationId,
    });

    // create route table for private subnet
    const cfnRouteTable = new ec2.CfnRouteTable(this, 'MyCfnRouteTable', {
      vpcId: vpc.vpcId,
    });

    // create route for private subnet to the nat in case of internet access
    new ec2.CfnRoute(this, 'MyCfnRoute', {
      routeTableId: cfnRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: cfnNatGateway.ref,
    });

    // associate the route table with the private subnet
    vpc.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnSubnetRouteTableAssociation(this, `MyCfnSubnetRouteTableAssociation${index}`, {
        routeTableId: cfnRouteTable.ref,
        subnetId: subnet.subnetId,
      });
    });
  }

  private deployApplicationInfrastructure(deploymentBucket: cdk.aws_s3.Bucket, memcachedConfigurationEndpoint: string, table: cdk.aws_dynamodb.Table, useCacheFlag : boolean, vpc: cdk.aws_ec2.IVpc, labRole: cdk.aws_iam.IRole) {
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash',
      'export NVM_DIR="$HOME/.nvm"',
      '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"',
      '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"',
      'nvm install node',
      'aws s3 cp s3://' + deploymentBucket.bucketName + ' /home/ec2-user --recursive',
      'cd /home/ec2-user',
      'npm install',
      'export MEMCACHED_CONFIGURATION_ENDPOINT=' + memcachedConfigurationEndpoint,
      'export TABLE_NAME=' + table.tableName,
      'export AWS_REGION=' + this.region,
      'export USE_CACHE=' + useCacheFlag,
      'node index.js'
    );

    // Use the VPC to create an autoscaling group
    const asg = new AutoScalingGroup(this, 'ASG', {
      vpc,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023 }),
      userData: userData,
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'vockey'),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      role: labRole,
      minCapacity: 1, // Note for students: you may need to change this min capacity for scaling testing if you belive that is right
      maxCapacity: 1, // Note for students: you may need to change this max capacity for scaling testing if you belive that is right
      desiredCapacity: 1, // Note for students: you may need to change this desired capacity for scaling testing if you belive that is right
    });

    // Create a load balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true,
    });

    // Add a listener and open up the load balancer's security group
    const listener = lb.addListener('Listener', {
      port: 80,
    });

    listener.addTargets('Target', {
      port: 80,
      targets: [asg],
    });

    // Note for students: you may need to change this for scaling testing if you belive that is right
    asg.scaleOnRequestCount('AModestLoad', {
      targetRequestsPerMinute: 60, 
    });

    // Output the DNS where you can access your service
    new cdk.CfnOutput(this, 'LoadBalancerURL', {
      value: `http://${lb.loadBalancerDnsName}`,
    });
  }

  private deployTheApplicationArtifactToS3Bucket(labRole: cdk.aws_iam.IRole) {
    // Note for students: This is for deployment purposes. you shold not change this code.
    const bucket = new s3.Bucket(this, 'DeploymentArtifact', {
      removalPolicy: cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    // Deploy the website content to the S3 bucket
    new s3Deployment.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3Deployment.Source.asset('./../service-files', {
        exclude: ['node_modules', '*.test.js'],
      })],
      destinationBucket: bucket,
      role: labRole,
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    });
    return bucket;
  }

  private createDynamoDBTable() {
    // Students TODO: Change the table schema as needed

    const table = new dynamodb.Table(this, 'Restaurants', {
      partitionKey: { name: 'SimpleKey', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1, // Note for students: you may need to change this num read capacity for scaling testing if you belive that is right
      writeCapacity: 1, // Note for students: you may need to change this num write capacity for scaling testing if you belive that is right
    });

    // Output the table name
    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
    });

    return table;
  }

  createMemcachedSingleInstaceInPublicSubnetForTestingPurpose(vpc: ec2.IVpc, labRole: iam.IRole) {
    // Note for students: This is dev testing purposes only. you shold not change this code.

    // Memcached User Data
    const memcachedUserData = ec2.UserData.forLinux();
    memcachedUserData.addCommands(
      `yum update -y
          yum install memcached -y
          sed -i 's/OPTIONS="-l 127.0.0.1,::1"/OPTIONS="-l 0.0.0.0"/' /etc/sysconfig/memcached
          systemctl start memcached
          systemctl enable memcached
          systemctl status memcached`
    );

    // create single ec2 instance with memcached installed in user data
    const memcachedInstance = new ec2.Instance(this, 'MemcachedInstance', {
      vpc,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023 }),
      keyName: 'vockey',
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      role: labRole,
      userData: memcachedUserData,
      associatePublicIpAddress: true,
    });

    // Create a security group for the EC2 instance
    const securityGroup = new ec2.SecurityGroup(this, 'MemcahcedInstanceSecurityGroup', {
      vpc,
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(11211), 'Allow inbound traffic from anywhere on port 11211');

    memcachedInstance.addSecurityGroup(securityGroup);

    // Output the public IP of the EC2 instance
    new cdk.CfnOutput(this, 'MemcachedInstancePublicIp', {
      value: memcachedInstance.instancePublicIp,
    });

    const memcachedInstanceEndpoint = `${memcachedInstance.instancePublicDnsName}:11211`;
    // output the memcached EC2 Instance endpoint with port 11211
    new cdk.CfnOutput(this, 'MemcachedInstanceEndpoint', {
      value: memcachedInstanceEndpoint,
    });

    return memcachedInstanceEndpoint;
  }

  createMemcachedElasticache(vpc: ec2.IVpc, labRole: iam.IRole) {
    // Note for students: This is for production/integration testing purposes only. you shold not change this code expect the line that marked.
    const memcachedSecurityGroup = new ec2.SecurityGroup(this, 'MemcachedSecurityGroup', {
      vpc,
    });

    memcachedSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(11211), 'Allow inbound traffic from anywhere on port 11211');

    const privateSubnetGroup = new elasticache.CfnSubnetGroup(this, 'MemcachedPrivateSubnetGroup', {
      description: 'Subnet group for elasticache for production purposes',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    // Create memcached elasticache
    const memcached = new elasticache.CfnCacheCluster(this, 'Memcached', {
      cacheSubnetGroupName: privateSubnetGroup.ref,
      cacheNodeType: 'cache.t2.micro',
      engine: 'memcached',
      numCacheNodes: 1, // Note for students: you may need to change this num cache nodes for scaling testing if you belive that is right
      vpcSecurityGroupIds: [memcachedSecurityGroup.securityGroupId],
    });

    const memcachedConfigurationEndpoint = memcached.getAtt('ConfigurationEndpoint.Address').toString();

    new cdk.CfnOutput(this, 'MemcachedConfigurationEndpoint', {
      value: memcachedConfigurationEndpoint,
    });

    return memcachedConfigurationEndpoint;
  }
}

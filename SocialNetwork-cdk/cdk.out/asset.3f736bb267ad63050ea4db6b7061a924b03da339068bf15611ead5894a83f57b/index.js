//getPresignUrlForUplodingProfileImage

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { S3RequestPresigner } = require("@aws-sdk/s3-request-presigner");
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { formatUrl } = require("@aws-sdk/util-format-url");
const { v4: uuidv4 } = require('uuid');
const { fromNodeProviderChain } = require("@aws-sdk/credential-provider-node");

const dynamoDbClient = new DynamoDBClient();
const s3Client = new S3Client();

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;

exports.handler = async (event) => {
    const username = event.queryStringParameters ? event.queryStringParameters.username : null;

      // Validate input
  if (username == null) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing username parameter" }),
    };
  }

  // Check if the user exists in DynamoDB
  const params = {
    TableName: TABLE_NAME,
    Key: {
      username: { S: username }
    }
  };

  try {
    const user = await dynamoDbClient.send(new GetItemCommand(params));

    if (!user.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' })
      };
    }

    // Define the folder path
    const folderPath = `${username}/`;

    // Check if the folder exists
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: folderPath
    };

    const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      // Create a dummy file in the folder to ensure it gets created
      const putParams = {
        Bucket: BUCKET_NAME,
        Key: `${folderPath}placeholder.txt`,
        Body: 'This is a placeholder file to create the folder'
      };

      await s3Client.send(new PutObjectCommand(putParams));
    }

    // Generate a pre-signed URL for uploading an image to this folder
    const fileName = `${username}_ProfilePicture.jpg` //uuidv4() + '.jpg';
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `${folderPath}${fileName}`
    };

    const presigner = new S3RequestPresigner({
      client: s3Client,
      credentials: fromNodeProviderChain(),
      region: process.env.AWS_REGION
    });

    const request = new HttpRequest({
      ...uploadParams,
      method: 'PUT',
      protocol: 'https:',
      hostname: `${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
      path: `/${folderPath}${fileName}`,
    });

    const signedUrl = formatUrl(await presigner.presign(request, { expiresIn: 3600 }));

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl: signedUrl })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};

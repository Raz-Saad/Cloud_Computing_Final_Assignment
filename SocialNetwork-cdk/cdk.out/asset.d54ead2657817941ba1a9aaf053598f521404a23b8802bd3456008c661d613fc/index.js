//getPresignUrlForUplodingProfileImage
/*
a lambda that gets a username and return a PUT presignURL for uploading a profile image into S3 bucket named - ImageStorage 
*/

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const dynamoDbClient = new DynamoDBClient();
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// environment variable 
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;

exports.handler = async (event) => {
  const username = event.queryStringParameters ? event.queryStringParameters.username : null;

  // Validate input
  if (username == null) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Missing username parameter" }),
    };
  }

  try {
    // Check if user exists before attempting deletion
    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: `User '${username}' not found` }),
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

    // listedObjects.KeyCount indicating how many files matched the prefix path BUCKET_NAME/username/
    if (listedObjects.KeyCount === 0) {
      // Create a dummy file in the folder to ensure it gets created
      const putParams = {
        Bucket: BUCKET_NAME,
        Key: `${folderPath}placeholder.txt`,
        Body: 'This is a placeholder file to create the folder'
      };

      await s3Client.send(new PutObjectCommand(putParams));
    }

    // Generate a pre-signed URL for uploading an image to this folder
    const fileName = `${username}_ProfilePicture.jpg`;
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `${folderPath}${fileName}`,
      ContentType: 'image/jpeg' // Specify the content type
    };

    const command = new PutObjectCommand(uploadParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Return the signed URL as the response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ uploadUrl: signedUrl })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};

async function getUserByUsername(username) {
  const getParams = {
    TableName: TABLE_NAME,
    Key: {
      UserName: { S: username }
    }
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetItemCommand(getParams));
    return Item ? true : false;
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw new Error("Error checking user existence");
  }
}


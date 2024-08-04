//deleteUserById

const { DynamoDBClient, DeleteItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;
const BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;

const dynamoDbClient = new DynamoDBClient({ region: AWS_REGION });
const s3Client = new S3Client({ region: AWS_REGION });

exports.handler = async function(event) {
  console.log("Received event:", JSON.stringify(event, undefined, 2));

  // Extracting username from query string parameters
  const username = event.queryStringParameters ? event.queryStringParameters.username : null;

  // Validate input
  if (username == null) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "DELETE, OPTIONS", // Updated to allow DELETE method
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
          "Access-Control-Allow-Origin": "*",  // Allow from all origins
          "Access-Control-Allow-Methods": "DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: `User '${username}' not found` }),
      };
    }

    // Delete user folder from S3 if it exists
    const folderPath = `${username}/`;
    const objectsInFolder = await listObjectsInFolder(folderPath);
    if (objectsInFolder.length > 0) {
      await deleteObjectsInFolder(folderPath, objectsInFolder);
    }

    // Delete user from DynamoDB
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: {
        UserName: { S: username } 
      }
    };

    await dynamoDbClient.send(new DeleteItemCommand(deleteParams));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: `User '${username}' deleted successfully` }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Internal server error" }),
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

async function listObjectsInFolder(folderPath) {
  const listParams = {
    Bucket: BUCKET_NAME,
    Prefix: folderPath
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(listParams));
    return data.Contents || [];
  } catch (error) {
    console.error("Error listing objects in folder:", error);
    throw new Error("Error listing objects in folder");
  }
}

async function deleteObjectsInFolder(folderPath, objects) {
  const deleteParams = {
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: objects.map(obj => ({ Key: obj.Key }))
    }
  };

  try {
    await s3Client.send(new DeleteObjectsCommand(deleteParams));
  } catch (error) {
    console.error("Error deleting objects in folder:", error);
    throw new Error("Error deleting objects in folder");
  }
}



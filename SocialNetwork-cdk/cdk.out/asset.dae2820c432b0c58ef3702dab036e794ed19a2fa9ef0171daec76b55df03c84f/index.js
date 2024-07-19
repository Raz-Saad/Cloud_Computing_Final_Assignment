//updateProfilePicture

const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME;
const ddbClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, undefined, 2));

  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // Only process images
  if (!key.endsWith('.jpg') && !key.endsWith('.png')) {
    console.log("Not an image. Skipping...");
    return;
  }

  const username = key.split('/')[0]; // Assuming the key format is "username/filename"

  // Generate the image URL
  const imageUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

  try {
    // Update DynamoDB table
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { UserName: { S: username } },
      UpdateExpression: 'SET validProfilePicture = :valid, profilePictureUrl = :url',
      ExpressionAttributeValues: {
        ':valid': { BOOL: true },
        ':url': { S: imageUrl },
      },
    };

    await ddbClient.send(new UpdateItemCommand(updateParams));

    console.log(`User ${username} updated with profile picture URL: ${imageUrl}`);
  } catch (error) {
    console.error("Error updating DynamoDB:", error);
    throw new Error("Error updating DynamoDB");
  }
};

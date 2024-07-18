//deleteUserById

const { DynamoDBClient, DeleteItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async function(event) {
  console.log("Received event:", JSON.stringify(event, undefined, 2));

  // Extracting username from query string parameters
  const username = event.queryStringParameters ? event.queryStringParameters.username : null;

  // Validate input
  if (username == null) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing username parameter" }),
    };
  }

  // Delete user from DynamoDB
  try {
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: {
        UserName: { S: username } // Assuming UserName is your partition key
      }
    };

    // Check if user exists before attempting deletion
    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `User '${username}' not found` }),
      };
    }

    await client.send(new DeleteItemCommand(deleteParams));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `User '${username}' deleted successfully` }),
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
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
    const { Item } = await client.send(new GetItemCommand(getParams));
    return Item ? true : false;
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw new Error("Error checking user existence");
  }
}

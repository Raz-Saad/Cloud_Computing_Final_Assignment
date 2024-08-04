//getUserById

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// Environment variables
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
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "GET, OPTIONS", // Updated to allow GET method
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Missing username parameter" }),
    };
  }

  // Retrieve user from DynamoDB
  try {
    const getParams = {
      TableName: TABLE_NAME,
      Key: {
        UserName: { S: username } // Assuming UserName is your partition key
      }
    };

    const data = await client.send(new GetItemCommand(getParams));

    console.log("DynamoDB response:", JSON.stringify(data, null, 2));

    if (!data.Item) {
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",  // Allow from all origins
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    // Convert DynamoDB item to JavaScript object
    const user = unmarshall(data.Item);
    console.log("Unmarshalled user:", user);

    // Extract specific attributes
    const { UserName, Email, FullName } = user;

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ username: UserName, email: Email, fullname: FullName }),
    };
  } catch (error) {
    console.error("Error retrieving user:", error);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

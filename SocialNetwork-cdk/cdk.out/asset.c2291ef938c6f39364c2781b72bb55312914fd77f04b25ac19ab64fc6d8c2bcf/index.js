//userLogin

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const bcrypt = require('bcrypt');

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const dynamoDbClient = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async function(event) {
  console.log("Received event:", JSON.stringify(event, undefined, 2));

  // Extracting username and password from the request body
  const { username, password } = JSON.parse(event.body || '{}');

  // Validate input
  if (!username || !password) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Username and password are required" }),
    };
  }

  try {
    // Fetch user data from DynamoDB
    const user = await getUserByUsername(username);
    if (!user) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",  // Allow from all origins
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Invalid username or password" }),
      };
    }

    // Compare provided password with stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.Password.S);
    if (isPasswordValid) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",  // Allow from all origins
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Login successful" }),
      };
    } else {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",  // Allow from all origins
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Invalid username or password" }),
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Allow from all origins
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    return Item || null;
  } catch (error) {
    console.error("Error retrieving user from DynamoDB:", error);
    throw new Error("Error retrieving user from DynamoDB");
  }
}

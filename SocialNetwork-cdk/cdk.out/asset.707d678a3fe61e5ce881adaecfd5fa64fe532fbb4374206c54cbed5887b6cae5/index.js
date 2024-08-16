//userLogin
/*
a lambda that gets a username and password, checks whether the info is correct
*/

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require('crypto');

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async function (event) {
  console.log("Received event:", JSON.stringify(event, undefined, 2));

  // Extracting username and password from the request body
  const { username, password } = JSON.parse(event.body);

  // Validate input
  if (!username || !password) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Missing username or password" }),
    };
  }

  try {
    // Retrieve user from DynamoDB
    const getParams = {
      TableName: TABLE_NAME,
      Key: {
        UserName: { S: username }
      }
    };

    const data = await client.send(new GetItemCommand(getParams));

    console.log("DynamoDB response data:", JSON.stringify(data, null, 2));

    if (!data.Item) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Username or password is incorrect" }),
      };
    }

    // Extract stored password hash
    const storedPasswordHash = data.Item.Password ? data.Item.Password.S : null;

    if (!storedPasswordHash) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Username or password is incorrect" }),
      };
    }

    // Hash the provided password
    const hash = crypto.createHash('sha256');
    hash.update(password);
    const passwordHash = hash.digest('hex');

    // Compare hashes
    if (storedPasswordHash === passwordHash) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
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
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};



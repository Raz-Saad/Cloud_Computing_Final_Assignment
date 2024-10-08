//Registration


const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require('crypto');

const TABLE_NAME = process.env.TABLE_NAME;
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  // Parse the JSON body
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Invalid JSON format" }),
    };
  }

  // Extracting parameters from parsed JSON body
  const username = requestBody.username || null;
  const email = requestBody.email || null;
  const password = requestBody.password || null;
  const fullname = requestBody.fullname || null;

  // Validate input
  if (username == null || email == null || password == null || fullname == null) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Missing required parameters" }),
    };
  }

  // Check if extra parameters are provided
  const validParams = ["username", "email", "password", "fullname"];
  const providedParams = Object.keys(requestBody);

  for (const key of providedParams) {
    if (!validParams.includes(key)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify({ message: "Invalid parameters provided" }),
      };
    }
  }

  // Check if the username already exists
  const userExists = await checkUserExists(username);
  if (userExists) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "Username already exists" }),
    };
  }

  // Hash the password using SHA-256
  const hashedPassword = hashPassword(password);

  // Insert new user into DynamoDB with hashed password
  const newUser = {
    UserName: { S: username },
    Email: { S: email },
    Password: { S: hashedPassword }, // Store hashed password instead of plain text
    FullName: { S: fullname }
  };

  const putParams = {
    TableName: TABLE_NAME,
    Item: newUser
  };

  try {
    await client.send(new PutItemCommand(putParams));

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: "User created successfully" }),
    };
  } catch (error) {
    console.error("Error inserting user:", error);
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

// Function to check if a user already exists
async function checkUserExists(username) {
  const getParams = {
    TableName: TABLE_NAME,
    Key: {
      UserName: { S: username }
    }
  };

  try {
    const result = await client.send(new GetItemCommand(getParams));
    return result.Item ? true : false;
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw new Error("Error checking user existence");
  }
}

// Function to hash the password using SHA-256
function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

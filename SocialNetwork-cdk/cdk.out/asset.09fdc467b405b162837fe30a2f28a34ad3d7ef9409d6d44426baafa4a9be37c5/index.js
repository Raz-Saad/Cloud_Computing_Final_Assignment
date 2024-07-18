const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async function(event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  
// Extracting parameters from query string if present
  const username =event.queryStringParameters.username;
  const email = event.queryStringParameters.email;
  const password = event.queryStringParameters.password;
  const fullName =event.queryStringParameters.fullName;

  // Validate input
  if (!username || !email || !password || !fullName) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing required parameters" }),
    };
  }

  // Check if extra parameters are provided
  const validParams = ["username", "email", "password", "fullName"];
  const allParams = { username, email, password, fullName };
  for (const key of Object.keys(allParams)) {
    if (!validParams.includes(key)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid parameters provided" }),
      };
    }
  }

  // Check if the username already exists
  const userExists = await checkUserExists(username);
  if (userExists) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Username already exists" }),
    };
  }

  // Insert new user into DynamoDB
  const newUser = {
    UserName: { S: username },
    Email: { S: email },
    Password: { S: password },
    FullName: { S: fullName }
  };

  const putParams = {
    TableName: TABLE_NAME,
    Item: newUser
  };

  try {
    await client.send(new PutItemCommand(putParams));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "User created successfully" }),
    };
  } catch (error) {
    console.error("Error inserting user:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
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

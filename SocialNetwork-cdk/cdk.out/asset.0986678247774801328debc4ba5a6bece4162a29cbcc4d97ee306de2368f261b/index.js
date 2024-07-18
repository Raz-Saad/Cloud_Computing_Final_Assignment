const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;


exports.handler = async function(event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const requestBody = JSON.parse(event.body);
  const { username, email, password, fullName } = requestBody;

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
  for (const key of Object.keys(requestBody)) {
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
    UserName: username,
    Email: email,
    Password: password,
    FullName: fullName
  };

  try {
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: newUser
    }).promise();

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
  const params = {
    TableName: TABLE_NAME,
    Key: {
      UserName: username
    }
  };

  try {
    const result = await dynamoDb.get(params).promise();
    return result.Item ? true : false;
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw new Error("Error checking user existence");
  }
}

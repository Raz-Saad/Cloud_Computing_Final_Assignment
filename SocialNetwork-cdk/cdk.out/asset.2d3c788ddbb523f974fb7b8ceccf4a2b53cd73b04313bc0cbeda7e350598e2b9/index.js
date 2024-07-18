const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async function(event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  // Extracting username from query string parameters
  const username = event.queryStringParameters ? event.queryStringParameters.username : null;

  // Validate input
  if (!username) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
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

    if (!data.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    const user = AWS.DynamoDB.Converter.unmarshall(data.Item);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    };
  } catch (error) {
    console.error("Error retrieving user:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

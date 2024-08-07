const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async (event) => {
    const username = event.queryStringParameters ? event.queryStringParameters.username : null;

    if (!username) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  // Allow from all origins
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('Username is required')
        };
    }

    try {
        // Query for posts with the given username and staging status 'staging' or 'error'
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'UsernameStagingIndex',
            KeyConditionExpression: 'UserName = :username AND (Staging = :staging OR Staging = :error)',
            ExpressionAttributeValues: {
                ':username': { S: username },
                ':staging': { S: 'staging' },
                ':error': { S: 'error' }
            }
        };

        const command = new QueryCommand(params);
        const data = await client.send(command);

        const posts = data.Items.map(item => ({
            PostID: item.PostID.S,
            Staging: item.Staging.S,
            Content: item.Content.S
        }));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  // Allow from all origins
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify(posts)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  // Allow from all origins
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('An error occurred while retrieving posts')
        };
    }
};

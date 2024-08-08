//getStagingAndErrorPosts
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
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('Username is required')
        };
    }

    try {
        // Define parameters for staging query
        const stagingParams = {
            TableName: TABLE_NAME,
            IndexName: 'UsernameStagingIndex',
            KeyConditionExpression: 'UserName = :username AND Staging = :staging',
            ExpressionAttributeValues: {
                ':username': { S: username },
                ':staging': { S: 'staging' }
            }
        };

        // Define parameters for error query
        const errorParams = {
            TableName: TABLE_NAME,
            IndexName: 'UsernameStagingIndex',
            KeyConditionExpression: 'UserName = :username AND Staging = :error',
            ExpressionAttributeValues: {
                ':username': { S: username },
                ':error': { S: 'error' }
            }
        };

        // Query DynamoDB for staging posts
        const [stagingData, errorData] = await Promise.all([
            client.send(new QueryCommand(stagingParams)),
            client.send(new QueryCommand(errorParams))
        ]);

        // Combine results from both queries
        const posts = [
            ...stagingData.Items.map(item => ({
                PostID: item.PostID.S,
                Staging: item.Staging.S,
                Content: item.Content.S
            })),
            ...errorData.Items.map(item => ({
                PostID: item.PostID.S,
                Staging: item.Staging.S,
                Content: item.Content.S
            }))
        ];

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify(posts)
        };

    } catch (error) {
        console.error("Error querying DynamoDB", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS , GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('An error occurred while retrieving posts')
        };
    }
};

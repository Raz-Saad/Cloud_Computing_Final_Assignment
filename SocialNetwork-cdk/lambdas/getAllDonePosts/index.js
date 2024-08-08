
//getAllDonePosts

const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async (event) => {
    const stagingStatus = 'done'; // Value to filter posts in the "done" staging state

    try {
        // Define parameters for querying posts with 'done' status
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'StagingIndex',
            KeyConditionExpression: 'Staging = :stagingStatus',
            ExpressionAttributeValues: {
                ':stagingStatus': { S: stagingStatus }
            },
            ProjectionExpression: 'PostID, Content, PostDate, UserName'
        });

        // Execute query
        const data = await client.send(command);

        // Map DynamoDB response to desired format
        const posts = data.Items.map(item => ({
            PostID: item.PostID.S,
            Content: item.Content.S,
            PostDate: item.PostDate.S,
            UserName: item.UserName.S
        }));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  // Allow from all origins
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify(posts),
        };
    } catch (error) {
        console.error('Error retrieving posts:', error);

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  // Allow from all origins
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({
                message: 'Error retrieving posts',
                error: error.message
            }),
        };
    }
};


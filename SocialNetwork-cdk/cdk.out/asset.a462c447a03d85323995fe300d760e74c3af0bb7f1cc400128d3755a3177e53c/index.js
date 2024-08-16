//deletePost
/*
a lambda that gets a postID and delete the post from the DynamoDB posts table 
*/

const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Parse the JSON body from the event
    const body = JSON.parse(event.body);
    const { postid } = body;

    if (!postid) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: 'postid is required' }),
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            PostID: { S: postid }
        }
    };

    try {
        const command = new DeleteItemCommand(params);
        await client.send(command);
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: 'Post deleted successfully' }),
        };
    } catch (error) {
        console.error('Error deleting post:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: 'Failed to delete post', error: error.message }),
        };
    }
};

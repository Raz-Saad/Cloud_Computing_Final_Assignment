//uploadPostByImageAfterEdit
/*
a lambda that gets a postID and content,update the content by postID and change the status to ‘done’ in the DynamoDB posts table 
*/

const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Parse input JSON
    const { postid, content } = JSON.parse(event.body);

    if (!postid || !content) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('Postid, and content are required')
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            PostID: { S: postid }
        },
        UpdateExpression: 'SET Content = :content, Staging = :staging',
        ExpressionAttributeValues: {
            ':content': { S: content },
            ':staging': { S: 'done' }
        },
        ConditionExpression: 'attribute_exists(PostID)' // Ensures the item exists
    };

    try {
        const command = new UpdateItemCommand(params);
        await client.send(command);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('Post updated successfully')
        };

    } catch (error) {
        console.error("Error updating post:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('An error occurred while updating the post')
        };
    }
};

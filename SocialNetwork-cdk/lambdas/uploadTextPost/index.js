//uploadTextPost

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: AWS_REGION });

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Parse the JSON body from the event
    const body = JSON.parse(event.body);
    const { username, content } = body;

    if (!username || !content) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('Username and content are required')
        };
    }

    try {
        // Generate a unique PostID
        const postId = Date.now().toString();

        // Get current date and format as "YYYY-MM-DD"
        const todayDate = new Date();
        const postDate = `${todayDate.getUTCFullYear()}-${String(todayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(todayDate.getUTCDate()).padStart(2, '0')}`;

        // Define parameters for inserting the post into DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: {
                PostID: { S: postId },
                UserName: { S: username },
                Staging: { S: 'done' }, // Set Staging to 'done'
                Content: { S: content },
                PostDate: { S: postDate }
            },
            ConditionExpression: "attribute_not_exists(PostID)"
        };

        // Insert the item into DynamoDB
        const command = new PutItemCommand(params);
        await client.send(command);
        console.log('Post saved successfully:', postId);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: 'Post created successfully', postId })
        };

    } catch (error) {
        console.error("Failed to save post:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify('An error occurred while creating the post')
        };
    }
};

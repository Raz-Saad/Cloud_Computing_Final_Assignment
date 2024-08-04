//getPresignUrlForViewingProfileImage

const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, GetObjectCommand, GetObjectCommandInput } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;
const s3Bucket = process.env.IMAGE_BUCKET_NAME; // S3 bucket name

const dynamoDbClient = new DynamoDBClient({ region: AWS_REGION });
const s3Client = new S3Client({ region: AWS_REGION });

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, undefined, 2));

    // Extract username from query string parameters
    const username = event.queryStringParameters ? event.queryStringParameters.username : null;

    // Validate input
    if (!username) {
        return {
            statusCode: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: "Missing username parameter" }),
        };
    }

    try {
        // Fetch user profile data from DynamoDB
        const user = await getUserProfile(username);
        if (!user || !user.profilePictureUrl) {
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization"
                },
                body: JSON.stringify({ message: "Profile picture not found" }),
            };
        }

        // Generate presigned URL for the profile picture
        const url = await generatePresignedUrl(user.profilePictureUrl);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ url }),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};

async function getUserProfile(username) {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            UserName: { S: username }
        }
    };

    try {
        const { Item } = await dynamoDbClient.send(new GetItemCommand(params));
        return Item ? AWS.DynamoDB.Converter.unmarshall(Item) : null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw new Error("Error fetching user profile");
    }
}

async function generatePresignedUrl(profilePictureUrl) {
    const params = {
        Bucket: s3Bucket,
        Key: getObjectKeyFromUrl(profilePictureUrl)
    };

    try {
        const command = new GetObjectCommand(params);
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiration
        return signedUrl;
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw new Error("Error generating presigned URL");
    }
}

function getObjectKeyFromUrl(url) {
    // Extract object key from the URL
    const urlParts = new URL(url);
    return urlParts.pathname.substring(1); // Remove leading slash
}

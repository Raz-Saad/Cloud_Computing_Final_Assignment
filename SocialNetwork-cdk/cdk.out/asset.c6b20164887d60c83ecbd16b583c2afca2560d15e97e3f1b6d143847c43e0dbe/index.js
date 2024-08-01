const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { SQSClient, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');

const ddbClient = new DynamoDBClient();
const sqsClient = new SQSClient();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const promises = event.Records.map(async (record) => {
    console.log('Processing record:', JSON.stringify(record, null, 2));

    const body = JSON.parse(record.body);
    const { username, bucket, key, text } = body;

    const postId = uuidv4(); // Generate a unique PostID

    // Get current date and format as "YYYY-MM-DD"
    const todayDate = new Date();
    const postDate = `${todayDate.getUTCFullYear()}-${String(todayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(todayDate.getUTCDate()).padStart(2, '0')}`;

    // Concatenate Username and Staging for the GSI
    const combined_username_staging = `${username}#${'staging'}`;

    const params = {
      TableName: process.env.POSTS_TABLE_NAME,
      Item: {
        PostID: { S: postId },
        Username: { S: username },
        Staging: { S: 'staging' },
        Content: { S: text },
        PostDate: { S: postDate }, 
        Username_Staging: { S: combined_username_staging }
      },
      ConditionExpression: "attribute_not_exists(PostID)"
    };

    try {
      const command = new PutItemCommand(params);
      await ddbClient.send(command);
      console.log('Post saved successfully:', postId);

      // Delete the message from the queue
      const deleteParams = {
        QueueUrl: process.env.QUEUE_URL,
        ReceiptHandle: record.receiptHandle
      };

      const deleteCommand = new DeleteMessageCommand(deleteParams);
      await sqsClient.send(deleteCommand);
      console.log('Message deleted from queue:', record.receiptHandle);

    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        console.error("PostID already exists");
      } else {
        console.error("Failed to save post:", error);
      }
    }
  });

  await Promise.all(promises);
};

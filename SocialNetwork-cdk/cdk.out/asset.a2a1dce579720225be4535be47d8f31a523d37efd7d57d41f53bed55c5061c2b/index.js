//storePostFromSQStoDb

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { SQSClient, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const ddbClient = new DynamoDBClient();
const sqsClient = new SQSClient();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const promises = event.Records.map(async (record) => {
    console.log('Processing record:', JSON.stringify(record, null, 2));

    const body = JSON.parse(record.body);
    const { username, bucket, key, text, isError } = body;

    const postId = Date.now().toString(); // Generate a unique PostID

    // Get current date and format as "YYYY-MM-DD"
    const todayDate = new Date();
    const postDate = `${todayDate.getUTCFullYear()}-${String(todayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(todayDate.getUTCDate()).padStart(2, '0')}`;
    const staging = isError === 'True' ? 'error' : 'staging';

    
    const params = {
      TableName: process.env.POSTS_TABLE_NAME,
      Item: {
        PostID: { S: postId },
        UserName: { S: username },
        Staging: { S: staging },
        Content: { S: text },
        PostDate: { S: postDate }, 
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

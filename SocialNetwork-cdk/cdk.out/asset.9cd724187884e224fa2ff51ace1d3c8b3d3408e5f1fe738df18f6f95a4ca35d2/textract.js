const AWS = require('aws-sdk');
const textract = new AWS.Textract();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  const promises = event.Records.map(async (record) => {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Only process images
    if (!key.endsWith('.jpg') && !key.endsWith('.png')) {
      console.log("Not an image. Skipping...");
      return;
    }

    // Extract username assuming the key format is "username/filename"
    const username = key.split('/')[0];
    console.log(`Processing image for user: ${username}`);

    const params = {
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    };

    try {
      const data = await textract.detectDocumentText(params).promise();
      console.log('Extracted Text:', JSON.stringify(data, null, 2));

      const sqsParams = {
        QueueUrl: process.env.OUTPUT_QUEUE_URL,
        MessageBody: JSON.stringify({ username ,bucket, key, text: data})
      };

      await sqs.sendMessage(sqsParams).promise();
      console.log('Message sent to SQS:', sqsParams);
    } catch (err) {
      console.error('Error processing Textract:', err);
    }
  });

  // Wait for all promises to complete
  await Promise.all(promises);
};

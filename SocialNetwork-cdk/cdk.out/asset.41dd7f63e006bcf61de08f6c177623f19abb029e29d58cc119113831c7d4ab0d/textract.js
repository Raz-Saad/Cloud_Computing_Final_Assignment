//textract

const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Create Textract and SQS clients
const textractClient = new TextractClient();
const sqsClient = new SQSClient();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const promises = event.Records.map(async (record) => {
    console.log('Processing record:', JSON.stringify(record, null, 2));
    
    if (!record.body) {
      console.error('No s3 object in record:', record);
      return;
    }
    
    
    // Parse the body to extract the bucket name and key
    const body = JSON.parse(record.body);
    const s3Record = body.Records[0].s3;

    if (!s3Record) {
      console.error('No s3 object in body:', record);
      return;
    }
    
    const bucket = s3Record.bucket.name;
    const key = decodeURIComponent(s3Record.object.key.replace(/\+/g, ' '));
    console.log(`bucket: ${bucket} and key ${key}`);
    
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
      // Extract text from an image
      const command = new DetectDocumentTextCommand(params);
      const data = await textractClient.send(command);
      console.log('Extracted Text:', JSON.stringify(data, null, 2));
      
      // Extract lines of text 
      const blocks = data.Blocks.filter(block => block.BlockType === 'LINE');
      
      if (blocks.length === 0) {
        console.error('No text detected in the image.');
        throw new Error('No text detected in the image.');
      }
      
      //sort line of text by their position on the page
      blocks.sort((a, b) => a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top);
      
      // Combine the lines of text into a single string
      const extractedText = blocks.map(block => block.Text).join(' ');
      console.log(`Extracted Text: ${extractedText}`);
      
      const sqsParams = {
        QueueUrl: process.env.OUTPUT_QUEUE_URL,
        MessageBody: JSON.stringify({ username, bucket, key, text: extractedText })
      };

      const sqsCommand = new SendMessageCommand(sqsParams);
      await sqsClient.send(sqsCommand);
      console.log('Message sent to SQS:', sqsParams);
    } catch (err) {
      console.error('Error processing Textract:', err);
    }
  });

  // Wait for all promises to complete
  await Promise.all(promises);
};

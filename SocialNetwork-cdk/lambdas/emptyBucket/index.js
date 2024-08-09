// empty a bucket from all is content
/*
a lambda that empty S3 buckets – *only for destroy 
*/

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client();

exports.handler = async (event) => {
  const bucketName = event.ResourceProperties.BucketName;

  try {
    // List all objects in the bucket
    const listObjectsCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const listedObjects = await s3Client.send(listObjectsCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return;
    }

    // Create a list of object keys to delete
    const deleteParams = {
      Bucket: bucketName,
      Delete: { Objects: [] }
    };

    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });

    // Delete all objects
    const deleteCommand = new DeleteObjectsCommand(deleteParams);
    await s3Client.send(deleteCommand);

    // Check if there are more objects to delete (pagination)
    if (listedObjects.IsTruncated) await exports.handler(event);

  } catch (err) {
    console.error(`Error deleting objects from bucket ${bucketName}:`, err);
    throw new Error(err);
  }
};

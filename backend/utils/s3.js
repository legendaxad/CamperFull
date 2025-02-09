import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import {
  S3URL,
  S3_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
} from "./secret.js";

const newS3client = new S3Client({
  region: S3_REGION,
  endpoint: S3URL,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});
export const sendFile = async (buffer, key) => {
  try {
    const upload = new Upload({
      client: newS3client,
      params: {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
      },
    });
    const data = await upload.done();
    if (data.$metadata.httpStatusCode === 200) {
      return data.Location;
    }
  } catch (error) {
    console.log("Error with sending", error);
  }
};

export const deleteFileFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });
    await newS3client.send(command);
  } catch (error) {
    console.log("Error deleting file", error);
    return false;
  }
};

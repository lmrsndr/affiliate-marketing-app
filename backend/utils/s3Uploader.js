const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadToS3(buffer, filename, folder, mimeType) {
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${filename}`;

  const uploadCommand = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: "private"
  });

  await s3.send(uploadCommand);

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    }),
    { expiresIn: 3600 } // 1 hour
  );

  return signedUrl;
}

module.exports = uploadToS3;

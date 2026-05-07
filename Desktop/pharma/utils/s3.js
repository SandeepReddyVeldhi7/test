import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

export const uploadToS3 = async (file, folder = "general") => {
  const fileStream = fs.createReadStream(file.path);

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: `${folder}/${Date.now()}-${file.originalname}`,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  const data = await s3.upload(params).promise();

  return data.Location;
};
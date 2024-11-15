const AWS = require('aws-sdk');
const middy = require('@middy/core');
const multipartParser = require('@middy/http-multipart-body-parser');

const handler = async (event) => {
  console.log('Function started');
  console.log('Environment Variables:', {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION,
    bucketName: process.env.S3_BUCKET_NAME,
  });

  // マルチパートフォームデータを解析した結果は event.body に格納されます
  const file = event.body.file; // フォームの input の name 属性が "file" の場合

  if (!file) {
    console.error('No file found in the request');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'ファイルが見つかりませんでした。' }),
    };
  }

  // AWS S3の設定
  const s3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION,
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: file.filename,
    Body: file.content, // file.content は Buffer オブジェクトです
    ContentType: file.contentType,
  };

  try {
    console.log('Uploading to S3 with params:', params);
    await s3.upload(params).promise();
    console.log('Upload successful');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'アップロードに成功しました！' }),
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'S3へのアップロードに失敗しました。', error: error.message }),
      };
  }
};

// ミドルウェアを適用
exports.handler = middy(handler).use(multipartParser());
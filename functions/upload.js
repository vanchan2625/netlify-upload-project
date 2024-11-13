// functions/upload.js
const AWS = require('aws-sdk');
const formidable = require('formidable-serverless');
const fs = require('fs');

// AWS SDK の設定
AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: 'ap-northeast-1', // 東京リージョン
});

const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  try {
    console.log('Function invoked');

    // Formidable-serverless のインスタンスを生成
    const form = new formidable.IncomingForm();

    // フォームデータの解析
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err);
          reject(err);
        } else {
          console.log('Form parsed successfully:', fields, files);
          resolve({ fields, files });
        }
      });
    });

    const file = files.file;
    if (!file) {
      console.error('No file found in the request');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'アップロードするファイルが見つかりません。' }),
      };
    }
    console.log('File received:', file);

    const fileContent = fs.readFileSync(file.path);
    console.log('File content read, size:', fileContent.length);

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `uploads/${file.name}`, // プレフィックスを使用してファイルを整理
      Body: fileContent,
      ContentType: file.type,
      ACL: 'public-read', // 必要に応じて調整
    };
    console.log('S3 upload parameters:', params);

    const data = await s3.upload(params).promise();
    console.log('File uploaded successfully:', data.Location);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'ファイルが正常にアップロードされました。', url: data.Location }),
    };

  } catch (error) {
    console.error('Error during upload:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'アップロードに失敗しました。', error: error.message }),
    };
  }
};
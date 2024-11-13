// functions/upload.js
const AWS = require('aws-sdk');
const formidable = require('formidable');
const fs = require('fs');
const streamifier = require('streamifier');

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

    // リクエストが Base64 エンコードされているか確認
    const isBase64 = event.isBase64Encoded;
    const body = isBase64 ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
    console.log('isBase64Encoded:', isBase64);
    console.log('Body length:', body.length);

    // Formidable インスタンスを生成し、ヘッダー情報を渡す
    const form = new formidable.IncomingForm({
      headers: event.headers, // ここでヘッダーを渡す
    });

    // フォームのパースを Promise でラップ
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        // streamifier を使用してバッファをストリームに変換
        const stream = streamifier.createReadStream(body);
        console.log('Stream created for parsing');

        form.parse(stream, (err, fields, files) => {
          if (err) {
            console.error('Form parse error:', err);
            reject(err);
          } else {
            console.log('Form parsed successfully:', fields, files);
            resolve({ fields, files });
          }
        });
      });
    };

    const { fields, files } = await parseForm();

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
      Key: `uploads/${file.name}`, // プレフィックスを使用
      Body: fileContent,
      ContentType: file.type,
      ACL: 'public-read', // 公開読み取りアクセス（必要に応じて調整）
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
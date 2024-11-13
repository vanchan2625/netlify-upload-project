// functions/upload.js
const AWS = require('aws-sdk');
const Busboy = require('busboy');
const { PassThrough } = require('stream');

// AWS SDK の設定
AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: 'ap-northeast-1', // 東京リージョン
});

const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    const isBase64 = event.isBase64Encoded;
    const body = isBase64 ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);

    const headers = event.headers || {};

    console.log('Starting upload function');
    console.log('Headers:', headers);
    console.log('Body length:', body.length);

    const busboy = new Busboy({
      headers: headers,
    });

    let uploadPromises = [];

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(`Uploading: ${filename}`);

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `uploads/${filename}`,
        Body: file,
        ContentType: mimetype,
        ACL: 'public-read',
      };

      uploadPromises.push(s3.upload(params).promise());
    });

    busboy.on('error', (error) => {
      console.error('Busboy error:', error);
      reject({
        statusCode: 500,
        body: JSON.stringify({ message: 'ファイルアップロード中にエラーが発生しました。', error: error.message }),
      });
    });

    busboy.on('finish', async () => {
      try {
        console.log('Busboy finished parsing');
        const results = await Promise.all(uploadPromises);
        console.log('All files uploaded successfully:', results);

        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'ファイルが正常にアップロードされました。', urls: results.map(r => r.Location) }),
        });
      } catch (error) {
        console.error('S3 upload error:', error);
        reject({
          statusCode: 500,
          body: JSON.stringify({ message: 'S3へのアップロードに失敗しました。', error: error.message }),
        });
      }
    });

    // PassThrough ストリームを作成してバッファを流す
    const stream = new PassThrough();
    stream.end(body);
    stream.pipe(busboy);
  });
};
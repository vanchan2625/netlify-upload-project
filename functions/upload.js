// functions/upload.js
const AWS = require('aws-sdk');
const formidable = require('formidable');
const fs = require('fs');

AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: 'ap-northeast-1', // 東京リージョン
});

const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
  const form = new formidable.IncomingForm();

  form.parse(event.body, (err, fields, files) => {
    if (err) {
      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({ message: 'フォームの解析中にエラーが発生しました。' }),
      });
    }

    const file = files.file;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME, // 環境変数からバケット名を取得
      Key: file.name,
      Body: fs.readFileSync(file.path),
      ContentType: file.type,
      ACL: 'public-read', // 公開読み取りアクセス
    };

    s3.upload(params, (s3Err, data) => {
      if (s3Err) {
        return callback(null, {
          statusCode: 500,
          body: JSON.stringify({ message: 'ファイルのアップロード中にエラーが発生しました。' }),
        });
      }
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({ message: 'ファイルが正常にアップロードされました。', url: data.Location }),
      });
    });
  });
};
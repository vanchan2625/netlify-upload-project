const AWS = require('aws-sdk');
const multiparty = require('multiparty');

exports.handler = (event, context, callback) => {
  const form = new multiparty.Form();

  form.parse(event, async (err, fields, files) => {
    if (err) {
      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({ message: 'ファイルの解析に失敗しました。' }),
      });
    }

    const file = files.file[0];

    // AWS S3の設定
    const s3 = new AWS.S3({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      region: process.env.S3_REGION,
    });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.originalFilename,
      Body: require('fs').createReadStream(file.path),
      ContentType: 'text/plain',
    };

    try {
      await s3.upload(params).promise();
      return callback(null, {
        statusCode: 200,
        body: JSON.stringify({ message: 'アップロードに成功しました！' }),
      });
    } catch (error) {
      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({ message: 'S3へのアップロードに失敗しました。', error: error.message }),
      });
    }
  });
};
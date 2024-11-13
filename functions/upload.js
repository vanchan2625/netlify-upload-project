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
  // CORS 対応: OPTIONS メソッドのハンドリング
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // 必要に応じて特定のオリジンに変更
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  return new Promise((resolve, reject) => {
    try {
      console.log('=== Upload Function Invoked ===');

      const isBase64 = event.isBase64Encoded;
      const bodyBuffer = isBase64
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body);
      console.log(`isBase64Encoded: ${isBase64}`);
      console.log(`Body Buffer Length: ${bodyBuffer.length} bytes`);

      const headers = event.headers || {};
      console.log('Event Headers:', headers);

      const busboy = new Busboy({
        headers: headers,
      });

      let uploadPromises = [];
      let fileCount = 0;

      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        fileCount++;
        console.log(`Processing file [${fileCount}]: ${filename}`);

        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `uploads/${filename}`,
          Body: file,
          ContentType: mimetype,
          ACL: 'public-read', // 必要に応じて調整
        };

        console.log(`S3 Upload Parameters for ${filename}:`, params);

        // ファイルを S3 にアップロード
        const uploadPromise = s3.upload(params).promise()
          .then(data => {
            console.log(`Successfully uploaded ${filename} to ${data.Location}`);
            return data.Location;
          })
          .catch(err => {
            console.error(`Error uploading ${filename}:`, err);
            throw err;
          });

        uploadPromises.push(uploadPromise);
      });

      busboy.on('error', (error) => {
        console.error('Busboy Error:', error);
        reject({
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*', // 必要に応じて特定のオリジンに変更
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
          body: JSON.stringify({
            message: 'ファイルアップロード中にエラーが発生しました。',
            error: error.message,
          }),
        });
      });

      busboy.on('finish', async () => {
        console.log('Busboy parsing finished');
        if (fileCount === 0) {
          console.error('No files were uploaded');
          reject({
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*', // 必要に応じて特定のオリジンに変更
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
              message: 'アップロードするファイルが見つかりません。',
            }),
          });
          return;
        }

        try {
          const uploadedUrls = await Promise.all(uploadPromises);
          console.log('All files uploaded successfully:', uploadedUrls);

          resolve({
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*', // 必要に応じて特定のオリジンに変更
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
              message: 'ファイルが正常にアップロードされました。',
              urls: uploadedUrls,
            }),
          });
        } catch (error) {
          console.error('Error during S3 upload:', error);
          reject({
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*', // 必要に応じて特定のオリジンに変更
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
              message: 'S3へのアップロードに失敗しました。',
              error: error.message,
            }),
          });
        }
      });

      // PassThrough ストリームを作成してバッファを流す
      const stream = new PassThrough();
      stream.end(bodyBuffer);
      stream.pipe(busboy);
    } catch (err) {
      console.error('Unexpected Error:', err);
      reject({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*', // 必要に応じて特定のオリジンに変更
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({
          message: '予期せぬエラーが発生しました。',
          error: err.message,
        }),
      });
    }
  });
};
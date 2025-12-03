const https = require('https');
const fs = require('fs');
const path = require('path');

const models = [
  'https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights_manifest.json',
  'https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-shard1',
  'https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-weights_manifest.json',
  'https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard1',
  'https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard2',
  'https://github.com/vladmandic/face-api/raw/master/model/tiny_face_detector_model-weights_manifest.json',
  'https://github.com/vladmandic/face-api/raw/master/model/tiny_face_detector_model-shard1',
];

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(url);
    const filePath = path.join(modelsDir, fileName);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file async if there's an error
      console.error(`Error downloading ${url}:`, err.message);
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('Starting model downloads...');
  try {
    for (const url of models) {
      await downloadFile(url);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
}

downloadAll();

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Create a 1x1 transparent PNG pixel base64
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Png, 'base64');

async function testUpload() {
  try {
    console.log('Starting upload test...');
    const form = new FormData();
    form.append('file', buffer, {
      filename: 'pixel.png',
      contentType: 'image/png',
    });

    const response = await axios.post('http://localhost:5000/api/upload', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log('Upload success!');
    console.log(response.data);
  } catch (error) {
    console.error('Upload failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testUpload();

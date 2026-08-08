import express from 'express';
import {v2 as cloudinary} from 'cloudinary';
import streamifier from 'streamifier';
import multer from 'multer';
const uploadRouter = express.Router();

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// upload Media files
uploadRouter.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded' });
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const imgOptions =  {
        transformation: [
          { width: 600, height: 600, crop: 'limit' }, // Adjust dimensions
          { quality: 'auto' }, // Automatically adjust quality
        ],
        maxFileSize: 5000000, // Limit to 5MB
    };

    const streamUpload = (req) => {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(imgOptions, (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            });
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
    };
    
    try {
        const result = await streamUpload(req);
        res.send(result);
    } catch (error) {
        res.status(error.http_code || 500).send({ message: error.message || 'Error uploading file' });
    }
});



import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local Storage setup removed in favor of Cloudinary (Stateless Architecture)

// Local Upload Route - Now redirects to Cloudinary transparently
uploadRouter.post('/local', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: 'Nenhum ficheiro enviado' });
        }
        
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const category = req.body.type || 'others';
        const safeCategory = ['driver', 'document', 'establishment', 'vehicle', 'others', 'client'].includes(category) ? category : 'others';

        const imgOptions = {
            folder: `nhiquela_driver/${safeCategory}`,
            transformation: [
              { quality: 'auto' }
            ],
            maxFileSize: 2000000 // 2MB
        };

        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(imgOptions, (error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };
        
        const result = await streamUpload(req);

        res.send({ 
            message: 'Upload feito com sucesso',
            url: result.secure_url,
            filename: result.public_id
        });
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).send({ message: 'Erro ao fazer upload: ' + (error.message || 'Unknown error') });
    }
});

export default uploadRouter;

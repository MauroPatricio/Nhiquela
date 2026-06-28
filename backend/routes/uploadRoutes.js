import express from 'express';
import {v2 as cloudinary} from 'cloudinary';
import streamifier from 'streamifier';
import multer from 'multer';
const uploadRouter = express.Router();

const upload = multer()

// upload Media files
uploadRouter.post('/',  upload.single('file'),async (req, res) => {
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
      }
    const streamUpload = (req) => {
    return new Promise((resolve, reject)=>{
        const stream = cloudinary.uploader.upload_stream(imgOptions,(error, result)=>{
            if (result){
                resolve(result);
            }else{
                    // reject(error);
                res.status(error.http_code).send({message: error.message})
            }
        });
        streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
    }
    
    const result = await streamUpload(req)


   res.send(result)
});



import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local Storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine the category of the upload (driver, document, establishment, vehicle, others)
        const category = req.body.type || 'others';
        const allowed = ['driver', 'document', 'establishment', 'vehicle', 'others'];
        const safeCategory = allowed.includes(category) ? category : 'others';
        const uploadPath = path.join(__dirname, '../../uploads/nhiquela_driver', safeCategory);
        // Ensure the directory exists
        import('fs').then(fs => {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        });
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const uploadLocal = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Local Upload Route
uploadRouter.post('/local', uploadLocal.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: 'Nenhum ficheiro enviado' });
        }
        
        // Construct the URL to access the file
        // The server.js should serve the /uploads folder statically
        const category = req.body.type || 'others';
        const safeCategory = ['driver', 'document', 'establishment', 'vehicle', 'others'].includes(category) ? category : 'others';
        const fileUrl = `/uploads/nhiquela_driver/${safeCategory}/${req.file.filename}`;
        
        res.send({ 
            message: 'Upload feito com sucesso',
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).send({ message: 'Erro ao fazer upload local: ' + error.message });
    }
});

export default uploadRouter;

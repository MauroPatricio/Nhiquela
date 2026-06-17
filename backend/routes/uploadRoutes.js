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


export default uploadRouter;

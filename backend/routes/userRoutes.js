import express from 'express';
import User from '../models/UserModel.js';
import { baseUrl, generateToken, isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Product from '../models/ProductModel.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';


const userRouter = express.Router();

// All Users
userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try{

      const page = req.query.page || 1;
      const pageSize = 10    
      
      const users = await User.find().skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});
      const countUsers = await User.countDocuments();
      const  pages = Math.ceil(countUsers/pageSize);
  
  
      res.send({users, pages});
    }catch(e){
      console.log(e);
    }
    
  })
);

// All Top Sellers
userRouter.get(
  '/top-sellers',
  expressAsyncHandler(async (req, res) => {
    const topSellers = await User.find({ isSeller: true, isApproved: true, isBanned: false })
      .sort({ 'seller.rating': -1 })
      .limit(4);
    res.send(topSellers);
  })
);

userRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate('seller.docType seller.province');
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
    }
  })
);

userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.isSeller = req.body.isSeller ;

      if (req.body.isSeller) {
        user.seller.name = req.body.sellerName || user.seller.name;
        user.seller.description =req.body.sellerDescription || user.seller.description;
        user.seller.logo = req.body.sellerLogo || user.seller.logo;
        user.seller.opentime= req.body.opentime ||user.seller.opentime;
        user.seller.closetime= req.body.closetime|| user.seller.closetime;
        user.seller.province=  req.body.sellerLocation|| user.seller.province;
        user.seller.docType=req.body.sellerDocument || user.seller.docType;
        user.seller.docNumber=req.body.sellerDocumentNumber || user.seller.docNumber;
        user.seller.backDocImg=req.body.sellerBackImgDoc|| user.seller.backDocImg;
        user.seller.frontDocImg=req.body.sellerFrontImgDoc || user.seller.frontDocImg;
        user.seller.address=req.body.sellerAddress || user.seller.address;
      }else{
        user.seller.name = "";
        user.seller.description = "";
        user.seller.logo = "";
        user.seller.opentime="",
        user.seller.closetime= ""; 
        user.seller.province=null;
        user.seller.docType=null;
        user.seller.docNumber="";
        user.seller.backDocImg="";
        user.seller.frontDocImg="";
        user.seller.address="";
      }

      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updateUser = await user.save();
      res.send({
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,
        isAdmin: updateUser.isAdmin,
        isDeliveryMan: updateUser.isDeliveryMan,
        isSeller: updateUser.isSeller,
        isBanned: updateUser.isBanned,
        seller: updateUser.seller,

        token: generateToken(updateUser),
      });
    } else {
      res.status(404).send({ message: 'Usuário não encontrado' });
    }
  })
);

userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name;
      user.email = req.body.email;
      user.isAdmin = Boolean(req.body.isAdmin);
      user.isSeller = Boolean(req.body.isSeller);
      user.isBanned = Boolean(req.body.isBanned);
      user.isDeliveryMan = Boolean(req.body.isDeliveryMan);
      user.isApproved = Boolean(req.body.isApproved);

      if(user.isBanned){
        user.isApproved=false;
         await Product.deleteMany({ seller: user._id });
      }

      if(user.isApproved){
        user.isBanned=false;
        await Product.updateMany({ seller: user._id }, { $set: { isActive: user.isApproved } });
      }

      await user.save();
      res.send({ message: 'Utilizador Actualizado Com Sucesso' });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
    }
  })
);

userRouter.post('/forget-password',
expressAsyncHandler(async(req, res)=>{
  const user = await User.findOne({email: req.body.email});

  if(user){
    const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '3h'})

    user.resetToken = token 
    await user.save();

    console.log(`${baseUrl()}/reset-password/${token}`)

    // mailgun().messages().send({
    //   from: '<me.mydomain.com>',
    //   to: `${user.name} <${user.email}>`,
    //   subject: `Resetar a senha`,
    //   html:
    //   `
    //   <p>Por favor click no link abaixo para resetar a sua senha</p>
    //   <a href="${baseUrl()}/reset-password/${token}">Resetar a senha</a>
    //   `
    // });


    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
          user: 'catalina.hammes45@ethereal.email',
          pass: 'waGWW2dqs2Ndr2Ej22'
      }
  });

  // Define the email options
const mailOptions = {
  from: 'sender@example.com',
  to: user.email,
  subject: 'Hello from Node.js',
  text: 'This is a test email from Node.js'
};
   
// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error occurred:', error.message);
  } else {
    console.log('Email sent:', info.response);
  }
});
    

  }else{
    res.status(404).send({message: 'Utilizador nao encontrado'})
  }
}));


userRouter.post('reset-password', expressAsyncHandler(async (req, res)=>{
  jwt.verify(req.body.token, process.env.JWT_SECRET, async(err, decode)=>{
    if(err){
      res.status(401).send({message: 'Invalid Token'})
    }else{
      const user = await User.findOne({resetToken: req.body.token});

      if(user){
        if(req.body.password){
          user.password = bcrypt.hashSync(req.body.password, 8)
          await user.save()
          res.send({message: 'Password Actualizada com Successo'})
        }
      }else{
        res.status(404).send({message: 'Utilizador nao encontrado'})
      }
    }
  })
}))








userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ phoneNumber: req.body.phoneNumber });



    if (user){
      if(user.isBanned){
        res.status(401).send({ message: 'Esta conta foi BANIDA!!! Solicito que contacte o Administrador' });
      }
    }
    if (user) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        res.send({
          _id: user._id,
          email: user.email,
          isAdmin: user.isAdmin,
          isApproved: user.isApproved,
          isBanned: user.isBanned,
          isDeliveryMan: user.isDeliveryMan,
          isSeller: user.isSeller,
          name: user.name,
          phoneNumber: user.phoneNumber,
          seller: user.seller,
          token: generateToken(user),
        });
        return;
      }
    }
    res.status(401).send({ message: 'Número de telefone ou senha invalida' });
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const userExist = await User.findOne({ phoneNumber: req.body.phoneNumber });
    const emailExist = await User.findOne({ email: req.body.email });

if(emailExist){
  res.status(409).send({ message: 'Ja existe um email identico registado' });
  return;
}

if (!userExist) {

      const newUser = new User({
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password),
        isSeller: req.body.isSeller,
      });
      if (newUser.isSeller) {
        const seller = {
          name: req.body.sellerName,
          logo: req.body.sellerLogo,
          description: req.body.sellerDescription,
          opentime: req.body.opentime,
          closetime: req.body.closetime,
          docType: req.body.sellerDocument,
          docNumber: req.body.sellerDocumentNumber,
          frontDocImg:req.body.sellerFrontImgDoc,
          backDocImg:req.body.sellerBackImgDoc,
          province: req.body.sellerLocation,
          address:  req.body.sellerAddress
        };
        newUser.seller = seller;
      }

      const user = await newUser.save();
      res.send({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin,
        isDeliveryMan: user.isDeliveryMan,
        isSeller: user.isSeller,
        isBanned: user.isBanned,
        token: generateToken(user),
      });
      return;
    }

    res.status(409).send({ message: 'Número de Registo Existente' });
  })
);

userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {

      await Product.deleteMany({seller: user._id });

      await user.deleteOne();

      res.send({ message: `Utilizador removido com sucesso` });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
    }
  })
);

export default userRouter;

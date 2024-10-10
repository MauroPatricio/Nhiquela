import express from 'express';
import User from '../models/UserModel.js';
import { baseUrl, generateToken, isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Product from '../models/ProductModel.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'

const userRouter = express.Router();

// All Users
userRouter.get(
  '/',
  // isAuth,
  // isAdmin,
  expressAsyncHandler(async (req, res) => {
    try{

      const page = req.query.page || 1;
      const pageSize = 10    
      
      const users = await User.find().skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1});
      const countUsers = await User.countDocuments();
      const pages = Math.ceil(countUsers/pageSize);
  
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


// All Sellers
userRouter.get(
  '/sellers',
  expressAsyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const pageSize = 10   
    try{

      const sellers = await User.find({ isSeller: true, isApproved: true, isBanned: false }).skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1})
        .sort({ 'seller.rating': -1 }).populate('seller.province');
      
      const countSellers = await User.countDocuments({ isSeller: true, isApproved: true, isBanned: false });
      const pages = Math.ceil(countSellers/pageSize);

      res.send({sellers,pages,countSellers});
    }catch(e){
      console.log(e)
    }
  })
);

userRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate('seller.province');
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
        user.seller.name = req.body.sellerName || req.body.seller.name || user.seller.name;
        user.seller.description =req.body.sellerDescription|| req.body.seller.description || user.seller.description;
        user.seller.logo = req.body.sellerLogo ||req.body.seller.logo || user.seller.logo;
        user.seller.opentime= req.body.opentime || req.body.seller.opentime ||user.seller.opentime;
        user.seller.closetime= req.body.closetime|| req.body.seller.closetime || user.seller.closetime;
        user.seller.province=  req.body.sellerLocation|| req.body.seller.province || user.seller.province;
        user.seller.address=req.body.sellerAddress || req.body.seller.address ||user.seller.address;
        user.seller.phoneNumberAccount=req.body.phoneNumberAccount|| req.body.seller.phoneNumberAccount|| user.seller.phoneNumberAccount;
        user.seller.alternativePhoneNumberAccount=req.body.alternativePhoneNumberAccount|| req.body.seller.alternativePhoneNumberAccount || user.seller.alternativePhoneNumberAccount;
        
        user.seller.accountType=req.body.accountType || req.body.seller.accountType || user.seller.accountType;
        user.seller.accountNumber=req.body.accountNumber || req.body.seller.accountNumber || user.seller.accountNumber;


        user.seller.latitude=req.body.latitude || req.body.seller.latitude || user.seller.latitude;
        user.seller.longitude=req.body.longitude || req.body.seller.longitude || user.seller.longitude;

        user.seller.alternativeAccountType=req.body.alternativeAccountType || req.body.seller.alternativeAccountType || user.seller.alternativeAccountType;
        user.seller.alternativeAccountNumber=req.body.alternativeAccountNumber || req.body.seller.alternativeAccountNumber || user.seller.alternativeAccountNumber;

        user.seller.workDayAndTime = req.body.workDaysWithTime || req.body.seller.workDayAndTime   || user.seller.workDaysWithTime;
      }else{
        user.seller.name = "";
        user.seller.description = "";
        user.seller.logo = "";
        user.seller.opentime="",
        user.seller.closetime= ""; 
        user.seller.province=null;
        user.seller.address="";
        user.seller.phoneNumberAccount="";    
        user.seller.alternativePhoneNumberAccount="";
        user.seller.accountType="";   
        user.seller.accountNumber="";
        user.seller.alternativeAccountType="";
        user.seller.alternativeAccountNumber="";
        user.seller.workDayAndTime=[];
      }


      if(user.isDeliveryMan){
        user.deliveryman.photo = req.body.deliveryManPhoto;
        user.deliveryman.name = req.body.deliveryManName;
        user.deliveryman.phoneNumber = req.body.deliveryManPhoneNumber;
        user.deliveryman.transport_type = req.body.deliveryMantransportType;
        user.deliveryman.transport_registration = req.body.deliveryMantransportRegistration;
        user.deliveryman.transport_color = req.body.deliveryMantransportColor;
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

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Example: 'Gmail', 'Yahoo', 'Outlook'
  port: 587,
  secure: false,
  auth: {
    user: 'mauro.patricio1@gmail.com',      // Your email address
    pass: 'kfgg cmdk hvsp ctil',         // Your email password
  },
  tls:{
    rejectUnauthorized: false
  }
});

userRouter.post('/forget-password',
expressAsyncHandler(async(req, res)=>{
  const user = await User.findOne({email: req.body.email});

  if(user){
    const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '3h'})

    user.resetToken = token 
    await user.save();

    console.log(`${baseUrl()}/reset-password/${token}`)

// Composicao do texto
const text = `<p>Por favor click no link abaixo para resetar a sua senha</p>
   <a href="${baseUrl()}/reset-password/${token}">Resetar a senha</a>`


// Email message configuration
const mailOptions = {
  from: 'mauro.patricio1@gmail.com',         
  to: user.email,       
  subject: 'Recuperação de senha – Nhiquela Shop',                
  text: text,
};

// Enviar email
transporter.sendMail(mailOptions, function (error, info) {
  if (error) {
    console.error('Error sending email:', error);
    res.status(404).send({message: 'Email não enviado'})

  } else {
    console.log('Email sent:', info.response);
    res.send({ message: 'Email enviado com Sucesso' });
  }
});
   

    

  }else{
    res.status(404).send({message: 'Utilizador não encontrado'})
  }
}));


userRouter.post('/reset-password', expressAsyncHandler(async (req, res)=>{
  jwt.verify(req.body.token, process.env.JWT_SECRET, async(err, decode)=>{
    if(err){
      res.status(401).send({message: 'Invalid Token'})
    }else{
      const user = await User.findOne({resetToken: req.body.token});
      if(user){
        if(req.body.password){
          user.password = bcrypt.hashSync(req.body.password, 8)
          await user.save()
          res.send({message: 'Password Actualizada com successo'})
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
    let user = null;

    if (req.body.phoneNumber.includes("@")){
      user = await User.findOne({ email: req.body.phoneNumber });

    }else{
      if (!isNaN(req.body.phoneNumber)) {
        user = await User.findOne({ phoneNumber: req.body.phoneNumber });
      } else {
        res.status(401).send({ message: 'Número de telefone inválido' });
      }
    }

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
  res.status(409).send({ message: 'Já existe um email idêntico registrado' });
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
          name: req.body.sellerName || req.body.seller.name,
          logo: req.body.sellerLogo || req.body.seller.logo,
          description: req.body.sellerDescription || req.body.seller.description,
          province: req.body.sellerLocation || req.body.seller.province,
          address:  req.body.sellerAddress || req.body.seller.address,
          phoneNumberAccount:  req.body.phoneNumberAccount || req.body.seller.phoneNumberAccount,
          alternativePhoneNumberAccount: req.body.alternativePhoneNumberAccount  || req.body.seller.alternativePhoneNumberAccount,
          accountType:  req.body.accountType  || req.body.seller.accountType,
          accountNumber: req.body.accountNumber|| req.body.seller.accountNumber,
          alternativeAccountType: req.body.alternativeAccountType || req.body.seller.alternativeAccountType,
          alternativeAccountNumber: req.body.alternativeAccountNumber || req.body.seller.alternativeAccountNumber,
          workDayAndTime: req.body.workDaysWithTime || req.body.seller.workDayAndTime,
          latitude:  req.body.seller.latitude,
          longitude:  req.body.seller.longitude,

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

    res.status(409).send({ message: 'Número de Registo existente' });
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

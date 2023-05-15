import express from 'express';
import User from '../models/UserModel.js';
import { generateToken, isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';

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
    const topSellers = await User.find({ isSeller: true })
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

      await user.save();
      res.send({ message: 'Utilizador Actualizado Com Sucesso' });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
    }
  })
);

userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ phoneNumber: req.body.phoneNumber });

    if (user) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        res.send({
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isAdmin: user.isAdmin,
          isSeller: user.isSeller,
          isDeliveryMan: user.isDeliveryMan,
          isBanned: user.isBanned,
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
      await user.deleteOne();

      res.send({ message: `Utilizador Removido Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
    }
  })
);

export default userRouter;

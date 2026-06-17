import express from 'express';
import User from '../models/UserModel.js';
import { baseUrl, generateToken, isAdmin, isAuth, isDeliveryMan } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Product from '../models/ProductModel.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'
import mongoose from 'mongoose';
import {updatePushToken} from '../controllers/userController.js'
import DeliverymanUpdateRequest from "../models/DeliverymanUpdateRequestModel.js";

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

import TipoEstabelecimento from '../models/TipoEstabelecimento.js';

userRouter.get(
  '/tipoestabelecimentos',
  expressAsyncHandler(async (req, res) => {
    const tipoestabelecimentos = await TipoEstabelecimento.find();
    res.send({ tipoestabelecimentos });
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




// Get all seller users by establishment type ID
userRouter.get(
  '/byestablishment/:id',
  expressAsyncHandler(async (req, res) => {
    try {
      const establishmentTypeId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = 10;
      
      // Validate establishmentTypeId
      if (!mongoose.Types.ObjectId.isValid(establishmentTypeId)) {
        return res.status(400).send({ message: 'Invalid establishment type ID' });
      }

      // Query to find only approved sellers associated with the given establishment type
     const query = {
        isSeller: true,
        isApproved: true,
        'seller.tipoEstabelecimento': { $exists: true, $eq: establishmentTypeId }
      };

      const users = await User.find(query)
        .select('-password -__v') // Exclude sensitive fields
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .populate('seller.tipoEstabelecimento'); // Populate establishment type name

      const countUsers = await User.countDocuments(query);
      const pages = Math.ceil(countUsers / pageSize);

      // Transform the data to include seller and establishment info
      const formattedUsers = users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        seller: {
          name: user.seller?.name,
          logo: user.seller?.logo,
          description: user.seller?.description,
          tipoEstabelecimento: user.seller?.tipoEstabelecimento?.name,
          address: user.seller?.address,
          contact: user.seller?.phoneNumberAccount,
          isOpen: user.seller?.openstore
        },
        createdAt: user.createdAt
      }));

      console.log('Passei daqui');

      res.send({
        users: formattedUsers,
        page,
        pages,
        countUsers
      });

    } catch (error) {
      console.error('Error fetching sellers by establishment:', error);
      res.status(500).send({ 
        message: 'Error fetching sellers',
        error: error.message 
      });
    }
  })
);



// Actualiza se a loja esta aberta ou fechada
userRouter.put(
  '/seller/:id',
  // isAuth,
  // isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
    
      user.seller.openstore = Boolean(req.body.isopenstore);

     
      await user.save();
      res.send({ message: 'Loja Actualizada com Sucesso' });
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
  subject: 'Recuperação de senha – nhiquela.',                
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

    const loginIdentifier = req.body.email || req.body.phoneNumber || '';

    if (loginIdentifier.includes("@")){
      user = await User.findOne({ email: loginIdentifier });
    }else{
      if (!isNaN(loginIdentifier) && loginIdentifier.trim() !== '') {
        user = await User.findOne({ phoneNumber: loginIdentifier });
      } else {
        res.status(401).send({ message: 'Email ou número de telefone inválido' });
        return;
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
          photo: user.photo,
          isAdmin: user.isAdmin,
          isApproved: user.isApproved,
          isBanned: user.isBanned,
          isDeliveryMan: user.isDeliveryMan,
          isSeller: user.isSeller,
          name: user.name,
          phoneNumber: user.phoneNumber,
          seller: user.seller,
          deliveryman: user.deliveryman,
          tipoEstabelecimento: user.tipoEstabelecimento,
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
 try {

  console.log("Requisicao Chegou Cadastrosss...")

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
        isDeliveryMan: req.body.isDeliveryMan,// Flag Adicionada
      });

      if (newUser.isSeller) {

        const seller = {
          name: req.body.sellerName || req.body.seller?.name,
          logo: req.body.sellerLogo || req.body.seller?.logo,
          description: req.body.sellerDescription || req.body.seller?.description,
          province: req.body.sellerLocation || req.body.seller?.province,
          address:  req.body.sellerAddress || req.body.seller?.address,
          phoneNumberAccount:  req.body.phoneNumberAccount || req.body.seller?.phoneNumberAccount,
          alternativePhoneNumberAccount: req.body.alternativePhoneNumberAccount  || req.body.seller?.alternativePhoneNumberAccount,
          accountType:  req.body.accountType  || req.body.seller?.accountType,
          accountNumber: req.body.accountNumber|| req.body.seller?.accountNumber,
          alternativeAccountType: req.body.alternativeAccountType || req.body.seller?.alternativeAccountType,
          alternativeAccountNumber: req.body?.alternativeAccountNumber || req.body.seller?.alternativeAccountNumber,
          workDayAndTime: req.body.workDaysWithTime || req.body.seller?.workDayAndTime,
          latitude:   req.body.latitude || req.body.seller?.latitude,
          longitude:  req.body.longitude ||  req.body.seller?.longitude,

        };
        newUser.seller = seller;
      }

       if (newUser.isDeliveryMan) {
        const deliveryman = {
          photo: req.body.photo,
          name: req.body.deliverymanName,
          phoneNumber: req.body.deliverymanPhoneNumber,
          transport_type: req.body.transport_type,
          transport_color: req.body.transport_color,
          transport_registration: req.body.transport_registration,

          vihicle_picture: req.body.vihicle_picture,
          vihicle_inspection: req.body.vihicle_inspection,
          vihicle_Insurance: req.body.vihicle_Insurance,

          license_front: req.body.license_front,
          license_back: req.body.license_back,

          document_type: req.body.document_type,
          document_front: req.body.document_front,
          document_back: req.body.document_back,

          Proof_of_Address: req.body.Proof_of_Address,
          Proof_of_Addres_Reason: req.body.Proof_of_Addres_Reason
        };
        newUser.deliveryman = deliveryman;
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
  }catch(error){
        console.error('Erro no registro de usuário:', error);

    }
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

//////////////////////////////////////////////////////// NEW-ENDPOINT /////////////////////////////////////////////

userRouter.post(
  "/deliveryman/update-request",           
  expressAsyncHandler(async (req, res) => {
    try {
      
     
      console.log("📩 [UPDATE REQUEST RECEBIDA] ========================");
      console.log("🔹 Headers:", JSON.stringify(req.headers, null, 2));
      console.log("🔹 Body:", JSON.stringify(req.body, null, 2));
      console.log("🔹 Query:", req.query);
      console.log("🔹 Params:", req.params);
      console.log("🔹 req.userId:", req.userId);
      console.log("🔹 req.phoneNumber:", req.phoneNumber);
      console.log("====================================================");
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // if (!user || !user.isDeliveryMan) {
      //   return res.status(403).send({ message: "Acesso negado: não é deliveryman." });
      // }

      const updateFields = {};

      // Copiar somente campos preenchidos
      const allowedFields = [
        "photo", "name", "phoneNumber", "transport_type", "transport_color", "transport_registration",
        "vihicle_picture", "vihicle_inspection", "vihicle_Insurance",
        "license_front", "license_back",
        "document_type", "document_front", "document_back",
        "Proof_of_Address", "Proof_of_Addres_Reason"
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
          updateFields[field] = req.body[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).send({ message: "Nenhum dado válido foi enviado para atualização." });
      }

      console.log("UserId", userId)

      const updateRequest = new DeliverymanUpdateRequest({
        deliverymanId: user._id,
        updatedFields: updateFields
      });

      await updateRequest.save();

      res.status(200).send({
        message: "Solicitação de atualização enviada com sucesso.",
        requestId: updateRequest._id
      });

    } catch (error) {
      console.error("Erro ao criar solicitação de atualização:", error);
      res.status(500).send({ message: "Erro interno do servidor." });
    }
  })
);

userRouter.put(
  "/deliveryman/update-request/:id/approve",
  expressAsyncHandler(async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).send({ message: "Acesso negado: apenas administradores podem aprovar solicitações." });
      }

      const requestId = req.params.id;
      const request = await DeliverymanUpdateRequest.findById(requestId);

      if (!request) {
        return res.status(404).send({ message: "Solicitação não encontrada." });
      }

      const user = await User.findById(request.deliverymanId);
      if (!user) {
        return res.status(404).send({ message: "Usuário não encontrado." });
      }

      // Atualizar somente campos enviados na solicitação
      user.deliveryman = { ...user.deliveryman, ...request.updatedFields };
      await user.save();

      request.status = "APPROVED";
      request.reviewedAt = new Date();
      request.reviewedBy = req.user._id;
      request.reason = req.body.reason || "";
      await request.save();

      res.send({ message: "Solicitação aprovada e dados atualizados." });
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error);
      res.status(500).send({ message: "Erro interno do servidor." });
    }
  })
);

//Historico de Viagens


////////////  Endpoint — Histórico para DeliveryMan

userRouter.get(
  "/deliveryman/update-requests",
  expressAsyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;

      const requests = await DeliverymanUpdateRequest.find({ deliverymanId: userId })
        .sort({ requestedAt: -1 }) // Mais recentes primeiro
        .populate("reviewedBy", "name email"); // Nome e email do admin que revisou

      res.status(200).send({
        message: "Histórico de solicitações obtido com sucesso.",
        requests
      });

    } catch (error) {
      console.error("Erro ao obter histórico de solicitações:", error);
      res.status(500).send({ message: "Erro interno do servidor." });
    }
  })
);

////////////  Endpoint — Histórico para Administrador

userRouter.get(
  "/admin/deliveryman/update-requests",
  expressAsyncHandler(async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).send({ message: "Acesso negado: apenas administradores podem acessar." });
      }

      const statusFilter = req.query.status; // Ex: ?status=PENDING
      const filter = statusFilter ? { status: statusFilter } : {};

      const requests = await DeliverymanUpdateRequest.find(filter)
        .sort({ requestedAt: -1 })
        .populate("deliverymanId", "name phoneNumber email") // Dados do deliveryman
        .populate("reviewedBy", "name email");

      res.status(200).send({
        message: "Histórico de solicitações obtido com sucesso.",
        requests
      });

    } catch (error) {
      console.error("Erro ao obter histórico para admin:", error);
      res.status(500).send({ message: "Erro interno do servidor." });
    }
  })
);

// ✅ Endpoint para solicitar atualização do deliveryman (precisa de aprovação)
userRouter.post(
  '/deliveryman/update-request',
  isAuth, // 🔥 ADICIONAR ESTE MIDDLEWARE
  isDeliveryMan,
  expressAsyncHandler(async (req, res) => {
    try {
      // 🔥 VERIFICAÇÃO ADICIONAL PARA GARANTIR QUE req.user EXISTE
      if (!req.user || !req.user._id) {
        return res.status(401).send({ 
          message: 'Usuário não autenticado.' 
        });
      }

      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).send({ 
          message: 'Usuário não encontrado.' 
        });
      }

      if (!user.isDeliveryMan) {
        return res.status(403).send({ 
          message: 'Acesso negado: apenas drivers podem solicitar atualizações.' 
        });
      }

      const updateFields = {};
      let requestType = 'PROFILE_UPDATE';

      // Campos permitidos para atualização
      const allowedFields = [
        'name', 'email', 'phoneNumber', 
        'transport_type', 'transport_color', 'transport_registration',
        'document_type', 'Proof_of_Addres_Reason',
        'photo', 'vihicle_picture', 'license_front', 'license_back',
        'document_front', 'document_back', 'vihicle_inspection', 
        'vihicle_Insurance', 'Proof_of_Address'
      ];

      // Filtrar apenas campos preenchidos e válidos
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined && 
            req.body[field] !== null && 
            req.body[field] !== '') {
          updateFields[field] = req.body[field];
        }
      });

      // Determinar o tipo de solicitação baseado nos campos
      const vehicleFields = ['transport_type', 'transport_color', 'transport_registration', 'vihicle_picture'];
      const documentFields = ['license_front', 'license_back', 'document_front', 'document_back', 'vihicle_inspection', 'vihicle_Insurance'];
      
      if (vehicleFields.some(field => updateFields[field])) {
        requestType = 'VEHICLE_UPDATE';
      } else if (documentFields.some(field => updateFields[field])) {
        requestType = 'DOCUMENT_UPDATE';
      }

      // Verificar se há campos para atualizar
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).send({ 
          message: 'Nenhum dado válido foi enviado para atualização.' 
        });
      }

      // Criar solicitação de atualização
      const updateRequest = new DriverUpdateRequest({
        driverId: userId,
        updatedFields: updateFields,
        status: 'PENDING',
        requestType: requestType
      });

      await updateRequest.save();

      res.status(201).send({
        message: 'Solicitação de atualização enviada com sucesso! Aguarde aprovação administrativa.',
        requestId: updateRequest._id,
        status: 'PENDING',
        requestType: requestType,
        estimatedReviewTime: '24-48 horas'
      });

    } catch (error) {
      console.error('❌ Erro ao criar solicitação de atualização do driver:', error);
      res.status(500).send({ 
        message: 'Erro interno do servidor ao processar solicitação.' 
      });
    }
  })
);

// ✅ Endpoint para ADMIN aprovar solicitação
userRouter.put(
  '/deliveryman/update-request/:requestId/approve',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const updateRequest = await DeliverymanUpdateRequest.findById(requestId)
        .populate('deliverymanId');

      if (!updateRequest) {
        return res.status(404).send({ 
          message: 'Solicitação de atualização não encontrada.' 
        });
      }

      if (updateRequest.status !== 'PENDING') {
        return res.status(400).send({ 
          message: 'Esta solicitação já foi processada.' 
        });
      }

      const user = await User.findById(updateRequest.deliverymanId._id);
      
      if (!user) {
        return res.status(404).send({ 
          message: 'Usuário deliveryman não encontrado.' 
        });
      }

      // Aplicar as atualizações aos dados do deliveryman
      Object.keys(updateRequest.updatedFields).forEach(field => {
        user.deliveryman[field] = updateRequest.updatedFields[field];
      });

      // Atualizar status da solicitação
      updateRequest.status = 'APPROVED';
      updateRequest.reviewedAt = new Date();
      updateRequest.reviewedBy = req.user._id;
      updateRequest.reason = reason || 'Aprovado pelo administrador';

      await Promise.all([
        user.save(),
        updateRequest.save()
      ]);

      res.send({
        message: 'Solicitação aprovada e dados do deliveryman atualizados com sucesso!',
        request: updateRequest
      });

    } catch (error) {
      console.error('❌ Erro ao aprovar solicitação:', error);
      res.status(500).send({ 
        message: 'Erro interno do servidor ao aprovar solicitação.' 
      });
    }
  })
);

// ✅ Endpoint para ADMIN rejeitar solicitação
userRouter.put(
  '/deliveryman/update-request/:requestId/reject',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).send({ 
          message: 'Motivo da rejeição é obrigatório.' 
        });
      }

      const updateRequest = await DeliverymanUpdateRequest.findById(requestId);

      if (!updateRequest) {
        return res.status(404).send({ 
          message: 'Solicitação de atualização não encontrada.' 
        });
      }

      if (updateRequest.status !== 'PENDING') {
        return res.status(400).send({ 
          message: 'Esta solicitação já foi processada.' 
        });
      }

      updateRequest.status = 'REJECTED';
      updateRequest.reviewedAt = new Date();
      updateRequest.reviewedBy = req.user._id;
      updateRequest.reason = reason;

      await updateRequest.save();

      res.send({
        message: 'Solicitação rejeitada com sucesso!',
        request: updateRequest
      });

    } catch (error) {
      console.error('❌ Erro ao rejeitar solicitação:', error);
      res.status(500).send({ 
        message: 'Erro interno do servidor ao rejeitar solicitação.' 
      });
    }
  })
);

// ✅ Endpoint para listar solicitações pendentes (ADMIN)
userRouter.get(
  '/deliveryman/update-requests',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const { status = 'PENDING', page = 1, limit = 10 } = req.query;

      const requests = await DeliverymanUpdateRequest.find({ status })
        .populate('deliverymanId', 'name email phoneNumber')
        .populate('reviewedBy', 'name email')
        .sort({ requestedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await DeliverymanUpdateRequest.countDocuments({ status });

      res.send({
        requests,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });

    } catch (error) {
      console.error('❌ Erro ao buscar solicitações:', error);
      res.status(500).send({ 
        message: 'Erro interno do servidor ao buscar solicitações.' 
      });
    }
  })
);

// ✅ Endpoint para deliveryman ver suas próprias solicitações
userRouter.get(
  '/deliveryman/my-update-requests',
  isAuth,
  isDeliveryMan,
  expressAsyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const requests = await DeliverymanUpdateRequest.find({ 
        deliverymanId: req.user._id 
      })
        .populate('reviewedBy', 'name email')
        .sort({ requestedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await DeliverymanUpdateRequest.countDocuments({ 
        deliverymanId: req.user._id 
      });

      res.send({
        requests,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });

    } catch (error) {
      console.error('❌ Erro ao buscar solicitações:', error);
      res.status(500).send({ 
        message: 'Erro interno do servidor ao buscar solicitações.' 
      });
    }
  })
);

//Rota de update do pushToken
userRouter.patch('/updatePushToken/:id', updatePushToken);

export default userRouter;

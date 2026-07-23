import express from 'express';
import User from '../models/UserModel.js';
import { baseUrl, generateToken, isAdmin, isAuth, isDeliveryMan, sendAdminNotificationEmail } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Product from '../models/ProductModel.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'
import mongoose from 'mongoose';
import TipoEstabelecimento from '../models/TipoEstabelecimento.js';
import { updatePushToken } from '../controllers/userController.js'
import DeliverymanUpdateRequest from "../models/DeliverymanUpdateRequestModel.js";

const userRouter = express.Router();

// All Users
userRouter.get(
  '/',
  // isAuth,
  // isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const page = req.query.page || 1;
      const pageSize = 10;

      const users = await User.find({ isDeleted: { $ne: true } })
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .populate('seller.tipoEstabelecimento'); // Adicionado populate para tipoEstabelecimento

      const countUsers = await User.countDocuments({ isDeleted: { $ne: true } });
      const pages = Math.ceil(countUsers / pageSize);

      res.send({ users, pages });
    } catch (e) {
      console.log(e);
      res.status(500).send({ message: 'Erro ao buscar usu�rios' });
    }
  })
);


userRouter.get(
  "/tipoestabelecimentos",
  expressAsyncHandler(async (req, res) => {
    try {
      // Pegue todos IDs de tipos de estabelecimentos usados pelos sellers
      const usados = await User.distinct("seller.tipoEstabelecimento", { seller: { $exists: true } });

      // Agora busque esses tipos no modelo TipoEstabelecimento
      const tipoestabelecimentos = await TipoEstabelecimento.find({ _id: { $in: usados } });

      res.send({ tipoestabelecimentos });
    } catch (e) {
      console.log(e);
      res.status(500).send({ message: "Erro ao buscar tipos de estabelecimentos" });
    }
  })
);

// All Top Sellers
userRouter.get(
  '/top-sellers',
  expressAsyncHandler(async (req, res) => {
    try {
      const topSellers = await User.find({
        isSeller: true,
        isApproved: true,
        isBanned: false,
        isDeleted: { $ne: true },
        'seller.tipoEstabelecimento': { $exists: true } // Garante que tem tipoEstabelecimento
      })
        .select('-password -token')
        .populate('seller.tipoEstabelecimento') // Popula os dados do tipo de estabelecimento
        .sort({ 'seller.rating': -1, 'seller.numReviews': -1 })
        .limit(4)
        .lean();

      if (!topSellers || topSellers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum vendedor encontrado',
          data: []
        });
      }

      // Formata a resposta para incluir o tipo de estabelecimento
      const formattedSellers = topSellers.map(seller => ({
        ...seller,
        seller: {
          ...seller.seller,
          tipoEstabelecimento: seller.seller.tipoEstabelecimento?.name || 'N�o especificado'
        }
      }));

      res.json({
        success: true,
        count: formattedSellers.length,
        sellers: formattedSellers
      });
    } catch (error) {
      console.error('Erro ao buscar top sellers:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao processar sua solicita��o'
      });
    }
  })
);

// All Sellers
userRouter.get(
  '/sellers',
  expressAsyncHandler(async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = 10;
      const { tipoEstabelecimento } = req.query;

      const query = {
        isSeller: true,
        isApproved: true,
        isBanned: false,
        isDeleted: { $ne: true }
      };

      if (tipoEstabelecimento && mongoose.Types.ObjectId.isValid(tipoEstabelecimento)) {
        query['seller.tipoEstabelecimento'] = tipoEstabelecimento;
      }

      // Buscar sellers sem duplicados
      const sellers = await User.find(query)
        .sort({ createdAt: -1 })
        .populate('seller.province')
        .populate('seller.tipoEstabelecimento');

      // Remover duplicados manualmente pelo _id
      const uniqueSellersMap = new Map();
      sellers.forEach(seller => {
        if (!uniqueSellersMap.has(String(seller._id))) {
          uniqueSellersMap.set(String(seller._id), seller);
        }
      });
      const uniqueSellers = Array.from(uniqueSellersMap.values());

      // Pagina��o
      const countSellers = uniqueSellers.length;
      const pages = Math.ceil(countSellers / pageSize);
      const paginatedSellers = uniqueSellers.slice(pageSize * (page - 1), pageSize * page);

      res.send({
        sellers: paginatedSellers,
        pages,
        countSellers,
        currentPage: page,
      });
    } catch (e) {
      console.error('Erro ao buscar vendedores:', e);
      res.status(500).send({ message: 'Erro ao buscar vendedores' });
    }
  })
);

userRouter.post(
  '/signinseller',
  expressAsyncHandler(async (req, res) => {
    const { phoneNumber, password, deviceToken } = req.body;



    // Buscar usu�rio vendedor
    const isEmail = phoneNumber.includes('@');
    const query = isEmail
      ? { email: phoneNumber, isSeller: true }
      : { phoneNumber, isSeller: true };

    const user = await User.findOne(query);

    // ? Usu�rio n�o existe
    if (!user) {
      return res.status(401).send({ message: 'Usu�rio n�o encontrado ou n�o � vendedor' });
    }

    // ? Conta banida
    if (user.isBanned) {
      return res.status(401).send({
        message: 'Esta conta foi BANIDA! Por favor, contacte o administrador.',
      });
    }

    // ? Senha errada
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).send({ message: 'Senha inv�lida' });
    }

    // Atualizar token do dispositivo, se fornecido
    if (deviceToken) {
      user.deviceToken = deviceToken;
      await user.save();
    }

    // Sucesso ? devolve dados completos
    return res.status(200).send({
      _id: user._id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      isBanned: user.isBanned,
      isSeller: user.isSeller,
      isDeliveryMan: user.isDeliveryMan,
      seller: user.seller,
      savedLocations: user.savedLocations || [],
      createdAt: user.createdAt,
      token: generateToken(user),
    });
  })
);


userRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).send({ message: 'ID de utilizador inválido' });
      }

      const user = await User.findById(req.params.id)
        .populate('seller.province')
        .populate('seller.tipoEstabelecimento'); // Adicionado populate para tipoEstabelecimento

      if (user) {
        res.send({
          ...user.toObject(),
          seller: {
            ...user.seller.toObject(),
            tipoEstabelecimento: user.seller.tipoEstabelecimento?.name || 'N�o especificado'
          }
        });
      } else {
        res.status(404).send({ message: 'Utilizador n�o encontrado' });
      }
    } catch (error) {
      console.error('Erro ao buscar usu�rio:', error);
      res.status(500).send({ message: 'Erro interno ao buscar usu�rio' });
    }
  })
);

userRouter.post(
  '/profile/locations',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        const { name, address, latitude, longitude } = req.body;

        // Ensure savedLocations exists
        if (!user.savedLocations) user.savedLocations = [];

        user.savedLocations.push({ name, address, latitude, longitude });
        const updatedUser = await user.save();

        res.status(201).send({ message: 'Localização guardada', locations: updatedUser.savedLocations });
      } else {
        res.status(404).send({ message: 'Usuário não encontrado' });
      }
    } catch (error) {
      console.error('Erro ao guardar localização:', error);
      res.status(500).send({ message: 'Erro ao guardar localização' });
    }
  })
);

userRouter.delete(
  '/profile/locations/:locationId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        user.savedLocations = user.savedLocations.filter(
          (loc) => loc._id.toString() !== req.params.locationId
        );
        const updatedUser = await user.save();
        res.send({ message: 'Localização removida', locations: updatedUser.savedLocations });
      } else {
        res.status(404).send({ message: 'Usuário não encontrado' });
      }
    } catch (error) {
      console.error('Erro ao remover localização:', error);
      res.status(500).send({ message: 'Erro ao remover localização' });
    }
  })
);
userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.profileImage = req.body.profileImage || user.profileImage;
        user.isSeller = req.body.isSeller;
        
        if (req.body.preferredPaymentMethod) {
            user.preferredPaymentMethod = req.body.preferredPaymentMethod;
        }

        if (req.body.isSeller) {
          user.seller = {
            ...user.seller,
            name: req.body.sellerName || req.body.seller?.name || user.seller.name,
            description: req.body.sellerDescription || req.body.seller?.description || user.seller.description,
            logo: req.body.sellerLogo || req.body.seller?.logo || user.seller.logo,
            opentime: req.body.opentime || req.body.seller?.opentime || user.seller.opentime,
            closetime: req.body.closetime || req.body.seller?.closetime || user.seller.closetime,
            province: req.body.sellerLocation || req.body.seller?.province || user.seller.province,
            address: req.body.sellerAddress || req.body.seller?.address || user.seller.address,
            phoneNumberAccount: req.body.phoneNumberAccount || req.body.seller?.phoneNumberAccount || user.seller.phoneNumberAccount,
            alternativePhoneNumberAccount: req.body.alternativePhoneNumberAccount || req.body.seller?.alternativePhoneNumberAccount || user.seller.alternativePhoneNumberAccount,
            accountType: req.body.accountType || req.body.seller?.accountType || user.seller.accountType,
            accountNumber: req.body.accountNumber || req.body.seller?.accountNumber || user.seller.accountNumber,
            latitude: req.body.latitude || req.body.seller?.latitude || user.seller.latitude,
            longitude: req.body.longitude || req.body.seller?.longitude || user.seller.longitude,
            alternativeAccountType: req.body.alternativeAccountType || req.body.seller?.alternativeAccountType || user.seller.alternativeAccountType,
            alternativeAccountNumber: req.body.alternativeAccountNumber || req.body.seller?.alternativeAccountNumber || user.seller.alternativeAccountNumber,
            workDayAndTime: req.body.workDaysWithTime || req.body.seller?.workDayAndTime || user.seller.workDayAndTime,
            tipoEstabelecimento: req.body.tipoEstabelecimento || req.body.seller?.tipoEstabelecimento || user.seller.tipoEstabelecimento // Adicionado tipoEstabelecimento
          };

          try {
            const Provider = mongoose.model('Provider');
            let provider = await Provider.findOne({ ownerId: user._id, providerType: 'BUSINESS' });
            if (!provider) {
              provider = new Provider({ ownerId: user._id, providerType: 'BUSINESS', status: 'active' });
            }
            provider.name = user.seller.name;
            provider.categoryId = user.seller.tipoEstabelecimento;
            provider.location = {
              lat: user.seller.latitude,
              lng: user.seller.longitude,
              address: user.seller.address,
              province: user.seller.province
            };
            provider.businessData = {
              logo: user.seller.logo,
              description: user.seller.description,
              openTime: user.seller.opentime,
              closeTime: user.seller.closetime,
              isOpen: user.seller.openstore
            };
            await provider.save();
          } catch (e) {
            console.log('Erro ao sincronizar Provider: ', e);
          }
        } else {
          // Limpa os dados do seller se n�o for mais um vendedor
          user.seller = {
            name: "",
            description: "",
            logo: "",
            opentime: "",
            closetime: "",
            province: null,
            address: "",
            phoneNumberAccount: "",
            alternativePhoneNumberAccount: "",
            accountType: "",
            accountNumber: "",
            alternativeAccountType: "",
            alternativeAccountNumber: "",
            workDayAndTime: [],
            tipoEstabelecimento: null // Adicionado tipoEstabelecimento
          };
        }

        if (user.isDeliveryMan) {
          user.deliveryman = {
            ...user.deliveryman,
            photo: req.body.deliveryManPhoto,
            name: req.body.deliveryManName,
            phoneNumber: req.body.deliveryManPhoneNumber,
            transport_type: req.body.deliveryMantransportType,
            transport_registration: req.body.deliveryMantransportRegistration,
            transport_color: req.body.deliveryMantransportColor,
            transferPreferences: {
                mPesaNumber: req.body.mPesaNumber !== undefined ? req.body.mPesaNumber : user.deliveryman?.transferPreferences?.mPesaNumber,
                eMolaNumber: req.body.eMolaNumber !== undefined ? req.body.eMolaNumber : user.deliveryman?.transferPreferences?.eMolaNumber
            }
          };
        }

        if (req.body.password) {
          user.password = bcrypt.hashSync(req.body.password, 8);
        }

        const updatedUser = await user.save();

        res.send({
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          profileImage: updatedUser.profileImage,
          isAdmin: updatedUser.isAdmin,
          isDeliveryMan: updatedUser.isDeliveryMan,
          isSeller: updatedUser.isSeller,
          isBanned: updatedUser.isBanned,
          seller: updatedUser.seller,
          deliveryman: updatedUser.deliveryman,
          preferredPaymentMethod: updatedUser.preferredPaymentMethod,
          savedLocations: updatedUser.savedLocations || [],
          createdAt: updatedUser.createdAt,
          token: generateToken(updatedUser),
        });
      } else {
        res.status(404).send({ message: 'Usu�rio n�o encontrado' });
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).send({ message: 'Erro ao atualizar perfil' });
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
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.isAdmin = Boolean(req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin);
      user.isSeller = Boolean(req.body.isSeller !== undefined ? req.body.isSeller : user.isSeller);
      user.isBanned = Boolean(req.body.isBanned !== undefined ? req.body.isBanned : user.isBanned);
      user.isDeliveryMan = Boolean(req.body.isDeliveryMan !== undefined ? req.body.isDeliveryMan : user.isDeliveryMan);
      user.isApproved = Boolean(req.body.isApproved !== undefined ? req.body.isApproved : user.isApproved);
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

      // Se o Admin atualizar os dados do Seller (Fornecedor)
      if (user.isSeller && req.body.seller) {
        user.seller = {
          ...user.seller,
          name: req.body.seller.name || user.seller?.name,
          logo: req.body.seller.logo || user.seller?.logo,
          description: req.body.seller.description || user.seller?.description,
          province: req.body.seller.province || user.seller?.province,
          tipoEstabelecimento: req.body.seller.tipoEstabelecimento || user.seller?.tipoEstabelecimento,
          address: req.body.seller.address || user.seller?.address,
          latitude: req.body.seller.latitude || user.seller?.latitude,
          longitude: req.body.seller.longitude || user.seller?.longitude,
          phoneNumberAccount: req.body.seller.phoneNumberAccount !== undefined ? req.body.seller.phoneNumberAccount : user.seller?.phoneNumberAccount,
          alternativePhoneNumberAccount: req.body.seller.alternativePhoneNumberAccount !== undefined ? req.body.seller.alternativePhoneNumberAccount : user.seller?.alternativePhoneNumberAccount,
        };
      }

      if (user.isBanned) {
        user.isApproved = false;
        await Product.updateMany({ seller: user._id }, { $set: { isActive: false } });
      }

      if (user.isApproved) {
        user.isBanned = false;
        await Product.updateMany({ seller: user._id }, { $set: { isActive: user.isApproved } });
      }

      await user.save();

      // Emitir evento pelo socket para real-time reload na app (ex: aprovação de motorista)
      const io = req.app.get('io');
      if (io) {
        io.emit('userStatusChanged', {
          userId: user._id,
          isApproved: user.isApproved,
          isBanned: user.isBanned,
          status: user.status
        });
      }

      res.send({ message: 'Utilizador Actualizado Com Sucesso' });
    } else {
      res.status(404).send({ message: 'Utilizador n�o encontrado' });
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

      if (!mongoose.Types.ObjectId.isValid(establishmentTypeId)) {
        return res.status(400).send({ message: 'Invalid establishment type ID' });
      }

      const query = {
        isSeller: true,
        isApproved: true,
        isDeleted: { $ne: true },
        'seller.tipoEstabelecimento': establishmentTypeId
      };

      const users = await User.find(query)
        .select('-password -__v')
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .populate('seller.tipoEstabelecimento')
        .lean(); // Use lean() for better performance

      const countUsers = await User.countDocuments(query);
      const pages = Math.ceil(countUsers / pageSize);

      // REMOVA COMPLETAMENTE O FILTRO DE DUPLICATAS - n�o � necess�rio
      // O MongoDB j� garante que n�o retorna documentos duplicados

      const formattedUsers = users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        seller: {
          name: user.seller?.name,
          logo: user.seller?.logo,
          description: user.seller?.description,
          tipoEstabelecimento: user.seller?.tipoEstabelecimento,
          address: user.seller?.address,
          contact: user.seller?.phoneNumberAccount,
          isOpen: user.seller?.openstore,
          latitude: user.seller?.latitude,
          longitude: user.seller?.longitude,
          numReviews: user.seller?.numReviews,
          rating: user.seller?.rating
        },
        createdAt: user.createdAt
      }));

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
// userRouter.put(
//   '/seller/:id',
//   // isAuth,
//   // isAdmin,
//   expressAsyncHandler(async (req, res) => {

//     const user = await User.findById(req.params.id);

//     if (user) {

//       user.seller.openstore = Boolean(req.body.isopenstore);


//       await user.save();
//       res.status(201).send({user,  message: 'Loja Actualizada com Sucesso' });
//     } else {
//       res.status(404).send({ message: 'Utilizador n�o encontrado' });
//     }
//   })
// );

// Actualiza o estado da loja e dos seus produtos de acordo com o estado da loja se esta aberta ou fechada
userRouter.put(
  '/seller/:id',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
      const isOpenStore = Boolean(req.body.isopenstore);
      user.seller.openstore = isOpenStore;

      await user.save();

      // Atualizar todos os produtos com o estado atual da loja
      await Product.updateMany(
        { seller: req.params.id },
        { isSellerOpen: isOpenStore }
      );

      // Emitir evento pelo socket
      const io = req.app.get('io');
      io.emit('storeStatusChanged', {
        sellerId: req.params.id,
        isOpen: user.seller.openstore,
      });

      res.status(201).send({
        user,
        message: 'Loja e produtos atualizados com sucesso',
      });
    } else {
      res.status(404).send({ message: 'Utilizador n�o encontrado' });
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
  tls: {
    rejectUnauthorized: false
  }
});

userRouter.post('/forget-password',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '3h' })

      user.token = token
      await user.save();

      console.log(`${baseUrl()}/reset-password/${token}`)

      // Composicao do texto
      const text = `<p>Por favor click no link abaixo para resetar a sua senha</p>
   <a href="${baseUrl()}/reset-password/${token}">Resetar a senha</a>`


      // Email message configuration
      const mailOptions = {
        from: 'mauro.patricio1@gmail.com',
        to: user.email,
        subject: 'Recupera��o de senha � nhiquela',
        text: text,
      };

      // Enviar email
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error('Error sending email:', error);
          res.status(404).send({ message: 'Email n�o enviado' })

        } else {
          console.log('Email sent:', info.response);
          res.send({ message: 'Email enviado com Sucesso' });
        }
      });




    } else {
      res.status(404).send({ message: 'Utilizador n�o encontrado' })
    }
  }));


// Atualiza apenas o estado da loja (aberta/fechada)
userRouter.patch(
  '/seller-status/:id',
  expressAsyncHandler(async (req, res) => {
    const { isOpenStore } = req.body; // true ou false
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilizador n�o encontrado' });
    }

    user.seller.openstore = Boolean(isOpenStore);
    await user.save();

    // Atualiza o estado dos produtos da loja
    await Product.updateMany(
      { seller: req.params.id },
      { isSellerOpen: Boolean(isOpenStore) }
    );

    // Notifica��o via socket
    const io = req.app.get('io');
    io.emit('storeStatusChanged', { sellerId: req.params.id, isOpen: Boolean(isOpenStore) });

    res.status(200).json({ message: 'Estado da loja atualizado com sucesso', isOpenStore: Boolean(isOpenStore) });
  })
);



userRouter.post('/reset-password', expressAsyncHandler(async (req, res) => {
  jwt.verify(req.body.token, process.env.JWT_SECRET, async (err, decode) => {
    if (err) {
      res.status(401).send({ message: 'Invalid Token' })
    } else {
      const user = await User.findOne({ token: req.body.token });
      if (user) {
        if (req.body.password) {
          user.password = bcrypt.hashSync(req.body.password, 8)
          await user.save()
          res.send({ message: 'Password Actualizada com successo' })
        }
      } else {
        res.status(404).send({ message: 'Utilizador não encontrado' })
      }
    }
  })
}))



// ==========================================
// DELIVERYMAN UPDATE REQUEST
// ==========================================
userRouter.post(
  '/deliveryman/update-request',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user || !user.isDeliveryMan) {
        return res.status(404).send({ message: 'Motorista n�o encontrado' });
      }

      // Instead of an approval flow, let's just update the driver directly to simplify,
      // or if DeliverymanUpdateRequest is required, save it there. The app says "enviadas para aprova��o"
      // Let's create the request model if needed, or directly update since it's just basic fields.
      // Actually, since we need to save the new fields:
      const updateData = req.body;

      // Check if transport_type is being updated
      const isTransportTypeChanging = updateData.transport_type && updateData.transport_type !== user.deliveryman.transport_type;
      
      let finalTransportType = user.deliveryman.transport_type;
      let finalBaseFee = user.deliveryman.assigned_base_fee;
      
      // If not changing service, apply directly
      if (!isTransportTypeChanging) {
        finalTransportType = updateData.transport_type || user.deliveryman.transport_type;
        finalBaseFee = updateData.assigned_base_fee !== undefined ? updateData.assigned_base_fee : user.deliveryman.assigned_base_fee;
      }

      // update user directly for now so changes take effect
      user.deliveryman = {
        ...(user.deliveryman.toObject ? user.deliveryman.toObject() : user.deliveryman),
        photo: updateData.photo || user.deliveryman.photo,
        vihicle_picture: updateData.vihicle_picture || user.deliveryman.vihicle_picture, // fallback
        vihicle_picture_front: updateData.vihicle_picture_front || user.deliveryman.vihicle_picture_front,
        vihicle_picture_back: updateData.vihicle_picture_back || user.deliveryman.vihicle_picture_back,
        license_front: updateData.license_front || user.deliveryman.license_front,
        license_back: updateData.license_back || user.deliveryman.license_back,
        document_front: updateData.document_front || user.deliveryman.document_front,
        document_back: updateData.document_back || user.deliveryman.document_back,
        vihicle_inspection: updateData.vihicle_inspection || user.deliveryman.vihicle_inspection,
        vihicle_Insurance: updateData.vihicle_Insurance || user.deliveryman.vihicle_Insurance,
        Proof_of_Address: updateData.Proof_of_Address || user.deliveryman.Proof_of_Address,
        phoneNumber: updateData.phoneNumber || user.deliveryman.phoneNumber,
        transport_type: finalTransportType,
        transport_color: updateData.transport_color || user.deliveryman.transport_color,
        transport_registration: updateData.transport_registration || user.deliveryman.transport_registration,
        document_type: updateData.document_type || user.deliveryman.document_type,
        Proof_of_Addres_Reason: updateData.Proof_of_Addres_Reason || user.deliveryman.Proof_of_Addres_Reason,
        hasHelpers: updateData.hasHelpers !== undefined ? updateData.hasHelpers : user.deliveryman.hasHelpers,
        helperCount: updateData.helperCount !== undefined ? updateData.helperCount : user.deliveryman.helperCount,
        assigned_base_fee: finalBaseFee,
        docUpdateStatus: 'Nenhum'
      };

      if (!isTransportTypeChanging && updateData.assigned_base_fee !== undefined && updateData.transport_type) {
        user.providedServices = [{
          serviceId: updateData.transport_type,
          customBasePrice: updateData.assigned_base_fee
        }];
      }

      // Também guardar a foto no campo profileImage do utilizador (raiz)
      if (updateData.photo) {
        user.profileImage = updateData.photo;
      }

      await user.save();

      // Create a record of the request
      const updateRequest = new DeliverymanUpdateRequest({
        deliverymanId: user._id,
        type: 'profile_update',
        status: isTransportTypeChanging ? 'PENDING' : 'APPROVED', 
        updatedFields: updateData
      });
      await updateRequest.save();
      await updateRequest.save();

      res.status(200).send({
        message: 'Solicitao de atualizao recebida com sucesso.',
        requestId: updateRequest._id
      });
    } catch (error) {
      console.error('Erro no update request do motorista:', error);
      res.status(500).send({ message: 'Erro ao processar solicita��o' });
    }
  })
);

// ==========================================
// OTP ROUTES (MOCK PARA DESENVOLVIMENTO)
// ==========================================

// Mock storage for OTPs in memory
const otpStore = new Map();

userRouter.post('/send-otp', expressAsyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).send({ message: 'N�mero de telefone � obrigat�rio' });
  }

  // Verifica se o utilizador existe
  let user;
  if (phoneNumber.includes('@')) {
    user = await User.findOne({ email: phoneNumber });
  } else {
    user = await User.findOne({ phoneNumber });
  }

  if (!user) {
    return res.status(404).send({ message: 'Conta/Usu�rio n�o encontrado. Registe-se primeiro.' });
  }

  if (user.isBanned) {
    return res.status(401).send({ message: 'Esta conta foi BANIDA. Por favor, contacte o Administrador.' });
  }

  // Gerar um c�digo OTP simples (ex: 1234 para testes ou random)
  const otpCode = "1234"; // Fixo para facilidade de teste

  // Guardar no Map (telefone -> otp)
  otpStore.set(phoneNumber, otpCode);

  // Em produ��o, aqui chamaria o Twilio, Firebase, InfoBip, etc.
  console.log(`[MOCK SMS] Enviando OTP ${otpCode} para ${phoneNumber}`);

  res.send({ message: 'C�digo SMS enviado com sucesso', success: true });
}));

userRouter.post('/verify-otp', expressAsyncHandler(async (req, res) => {
  const { phoneNumber, otp, deviceToken } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).send({ message: 'Telefone e c�digo s�o obrigat�rios' });
  }

  const storedOtp = otpStore.get(phoneNumber);

  if (!storedOtp || storedOtp !== otp) {
    return res.status(401).send({ message: 'C�digo inv�lido ou expirado' });
  }

  // C�digo correto, limpar da mem�ria
  otpStore.delete(phoneNumber);

  // Fazer Login
  let user;
  if (phoneNumber.includes('@')) {
    user = await User.findOne({ email: phoneNumber });
  } else {
    user = await User.findOne({ phoneNumber });
  }

  if (!user) {
    return res.status(404).send({ message: 'Utilizador n�o encontrado' });
  }

  // Atualiza o token do dispositivo
  if (deviceToken) {
    if (!user.deviceTokens) {
      user.deviceTokens = [];
    }
    if (!user.deviceTokens.includes(deviceToken)) {
      user.deviceTokens.push(deviceToken);
      await user.save();
    }
  }

  res.send({
    _id: user._id,
    name: user.name,
    photo: user.photo,
    email: user.email,
    phoneNumber: user.phoneNumber,
    isDeliveryMan: user.isDeliveryMan,
    deliveryman: user.deliveryman,
    savedLocations: user.savedLocations || [],
    createdAt: user.createdAt,
    token: generateToken(user),
  });
}));


// ==========================================
// FORGOT PASSWORD
// ==========================================
userRouter.post('/forgot-password', expressAsyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).send({ message: 'N�mero de telefone � obrigat�rio' });
  }

  let user;
  if (phoneNumber.includes('@')) {
    user = await User.findOne({ email: phoneNumber });
  } else {
    user = await User.findOne({ phoneNumber });
  }

  if (!user) {
    return res.status(404).send({ message: 'Conta/Usu�rio n�o encontrado.' });
  }

  if (!user.email) {
    return res.status(400).send({ message: 'N�o existe nenhum email associado a esta conta.' });
  }

  // Gera uma nova senha aleat�ria de 6 d�gitos
  const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash da nova senha e atualiza no BD
  user.password = bcrypt.hashSync(newPassword, 8);
  await user.save();

  // MOCK DE ENVIO DE EMAIL
  console.log('================================================');
  console.log(`[MOCK EMAIL] Para: ${user.email}`);
  console.log(`Assunto: Recupera��o de Palavra-passe - Nhiquela`);
  console.log(`Mensagem: Ol� ${user.name}, a sua nova senha de acesso �: ${newPassword}`);
  console.log('================================================');

  res.send({
    message: 'Uma nova senha foi enviada para o seu email registado.',
    success: true,
    emailMasked: user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => {
      return gp2 + gp3.replace(/./g, '*');
    })
  });
}));

// --- ROTA DE RESET DE PASSWORD (ADMIN) ---
userRouter.put(
  '/:id/reset-password',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.password = bcrypt.hashSync('password123', 8);
      user.requirePasswordChange = true;
      const updatedUser = await user.save();
      res.send({ message: 'Palavra-passe redefinida para password123. O utilizador terá de a alterar no próximo login.', user: updatedUser });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado.' });
    }
  })
);

// --- ROTA DE FORÇAR UPDATE DE PASSWORD (USER) ---
userRouter.put(
  '/:id/force-update-password',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
        user.requirePasswordChange = false;
      }
      const updatedUser = await user.save();

      res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        requirePasswordChange: updatedUser.requirePasswordChange,
        token: generateToken(updatedUser),
      });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado.' });
    }
  })
);

userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const { phoneNumber, email, password, deviceToken } = req.body;

    let user = null;

    // --- Buscar usu�rio por email ou telefone ---
    if (email) {
      user = await User.findOne({ email });
    } else if (phoneNumber) {
      if (typeof phoneNumber === 'string' && phoneNumber.includes('@')) {
        user = await User.findOne({ email: phoneNumber });
      } else if (!isNaN(phoneNumber)) {
        user = await User.findOne({ phoneNumber });
      } else {
        return res.status(400).send({ message: 'N�mero de telefone inv�lido.' });
      }
    } else {
      return res.status(400).send({ message: 'E-mail ou Telefone s�o obrigat�rios.' });
    }

    // --- Verificar se usu�rio existe ---
    if (!user) {
      return res.status(401).send({ message: 'Conta/Usu�rio n�o encontrado.' });
    }

    // --- Verificar se est� banido ---
    if (user.isBanned) {
      return res.status(401).send({
        message: 'Esta conta foi BANIDA. Por favor, contacte o Administrador.',
      });
    }

    // --- Verificar senha ---
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send({ message: 'Senha invlida.' });
    }

    // --- Atualizar deviceToken se presente ---
    if (deviceToken) {
      user.deviceToken = deviceToken;
      await user.save();
    }

    // --- Responder com dados do usurio e token ---
    const userObj = {
      _id: user._id,
      email: user.email,
      photo: user.profileImage || user.photo || null,       // compatibilidade com apps antigas
      profileImage: user.profileImage || user.photo || null, // campo real da BD
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      isBanned: user.isBanned,
      isDeliveryMan: user.isDeliveryMan,
      isSeller: user.isSeller,
      isShopper: user.isShopper || false,
      assignedEstablishments: user.assignedEstablishments || [],
      name: user.name,
      phoneNumber: user.phoneNumber,
      status: user.status,              // ⬅️ campo chave para aprovação do motorista
      availability: user.availability,  // ⬅️ estado online/offline
      seller: user.seller || null,
      deliveryman: user.deliveryman ? { ...JSON.parse(JSON.stringify(user.deliveryman)) } : null,
      tipoEstabelecimento: user.tipoEstabelecimento || null,
      savedLocations: user.savedLocations || [],
      createdAt: user.createdAt,
      requirePasswordChange: user.requirePasswordChange || false,
      token: generateToken(user),
    };

    if (user.isDeliveryMan && userObj.deliveryman) {
      try {
        const { getWallet } = await import('../services/walletService.js');
        const wallet = await getWallet(user._id);
        if (wallet) {
          userObj.deliveryman.balance = `MT ${Number(wallet.balance || 0).toFixed(2)}`;
        }

        const Order = (await import('../models/OrderModel.js')).default;
        const RequestService = (await import('../models/RequestServiceModel.js')).default;

        const orders = await Order.find({ 'deliveryman.id': user._id, isDelivered: true });
        const requests = await RequestService.find({ 'deliveryman.id': user._id, isDelivered: true });

        const allTrips = [...orders, ...requests];
        userObj.deliveryman.totalTrips = allTrips.length;

        let todayEarnings = 0;
        let totalEarnings = 0;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        allTrips.forEach(trip => {
          let price = Number(trip.pricing?.totalPrice || trip.deliveryPrice || trip.deliveryman?.pricetopay || 0);
          if (isNaN(price)) {
            price = 0;
          }
          totalEarnings += price;
          const tripDate = new Date(trip.deliveredAt || trip.updatedAt || trip.createdAt);
          if (tripDate >= startOfToday) {
            todayEarnings += price;
          }
        });

        userObj.deliveryman.todayEarnings = todayEarnings;
        userObj.deliveryman.totalEarnings = totalEarnings;
      } catch (err) {
        console.error('Error fetching driver stats on signin', err);
      }
    }

    res.status(200).send(userObj);
  })
);






userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    try {
      const userExist = await User.findOne({ phoneNumber: req.body.phoneNumber });
      const emailExist = await User.findOne({ email: req.body.email });

      if (emailExist) {
        return res.status(409).send({ message: 'J� existe um email id�ntico registrado' });
      }

      if (!userExist) {
        if (!req.body.password) {
          return res.status(400).send({ message: 'A palavra-passe � obrigat�ria' });
        }
        const newUser = new User({
          name: req.body.name,
          phoneNumber: req.body.phoneNumber,
          email: req.body.email,
          password: bcrypt.hashSync(req.body.password),
          isSeller: req.body.isSeller,
          isDeliveryMan: req.body.isDeliveryMan,
          isShopper: req.body.isShopper,
          profileImage: req.body.profileImage || null,
        });


        if (newUser.isSeller) {
          let provinceId = null;
          const provinceInput = req.body.sellerLocation || req.body.seller?.province;
          if (provinceInput) {
            if (mongoose.Types.ObjectId.isValid(provinceInput)) {
              provinceId = provinceInput;
            } else {
              const Province = mongoose.model('Province');
              const foundProv = await Province.findOne({ name: { $regex: new RegExp(`^${provinceInput}$`, 'i') } });
              if (foundProv) provinceId = foundProv._id;
            }
          }

          let tipoEstId = null;
          const tipoEstInput = req.body.tipoEstabelecimento || req.body.seller?.tipoEstabelecimento;
          if (tipoEstInput) {
            if (mongoose.Types.ObjectId.isValid(tipoEstInput)) {
              tipoEstId = tipoEstInput;
            } else {
              const EstablishmentType = mongoose.model('EstablishmentType');
              const foundType = await EstablishmentType.findOne({ name: { $regex: new RegExp(`^${tipoEstInput}$`, 'i') } });
              if (foundType) tipoEstId = foundType._id;
            }
          }

          newUser.seller = {
            name: req.body.sellerName || req.body.seller?.name,
            logo: req.body.sellerLogo || req.body.seller?.logo,
            description: req.body.sellerDescription || req.body.seller?.description,
            province: provinceId,
            address: req.body.sellerAddress || req.body.seller?.address,
            phoneNumberAccount: req.body.phoneNumberAccount || req.body.seller?.phoneNumberAccount,
            alternativePhoneNumberAccount: req.body.alternativePhoneNumberAccount || req.body.seller?.alternativePhoneNumberAccount,
            accountType: req.body.accountType || req.body.seller?.accountType,
            accountNumber: req.body.accountNumber || req.body.seller?.accountNumber,
            alternativeAccountType: req.body.alternativeAccountType || req.body.seller?.alternativeAccountType,
            alternativeAccountNumber: req.body.alternativeAccountNumber || req.body.seller?.alternativeAccountNumber,
            workDayAndTime: req.body.workDaysWithTime || req.body.seller?.workDayAndTime,
            latitude: req.body.latitude || req.body.seller?.latitude,
            longitude: req.body.longitude || req.body.seller?.longitude,
            tipoEstabelecimento: tipoEstId
          };
        }

        if (newUser.isDeliveryMan) {
          const requiredFields = [
            'photo', 'transport_type', 'transport_color',
            'transport_registration', 'vihicle_picture', 'vihicle_picture_front',
            'vihicle_picture_back', 'vihicle_inspection', 'vihicle_Insurance',
            'vihicle_logbook', 'license_front', 'license_back',
            'document_front', 'document_back', 'Proof_of_Address'
          ];
          for (let field of requiredFields) {
            if (!req.body[field]) {
              return res.status(400).send({ message: `O campo ${field} é obrigatório para motoristas` });
            }
          }

          newUser.deliveryman = {
            photo: req.body.photo,
            name: req.body.name,
            phoneNumber: req.body.phoneNumber,
            transport_type: req.body.transport_type,
            assigned_base_fee: req.body.providedServices && req.body.providedServices.length > 0 ? req.body.providedServices[0].customBasePrice : undefined,
            transport_color: req.body.transport_color,
            transport_registration: req.body.transport_registration,
            vihicle_picture: req.body.vihicle_picture,
            vihicle_picture_front: req.body.vihicle_picture_front,
            vihicle_picture_back: req.body.vihicle_picture_back,
            vihicle_inspection: req.body.vihicle_inspection,
            vihicle_Insurance: req.body.vihicle_Insurance,
            vihicle_logbook: req.body.vihicle_logbook,
            license_front: req.body.license_front,
            license_back: req.body.license_back,
            document_type: req.body.document_type || 'bi',
            document_front: req.body.document_front,
            document_back: req.body.document_back,
            Proof_of_Address: req.body.Proof_of_Address,
            register_conformance: "PENDING_CONFORMANCE",
            transferPreferences: {
                mPesaNumber: req.body.mPesaNumber || '',
                eMolaNumber: req.body.eMolaNumber || ''
            }
          };

          if (req.body.providedServices) {
            newUser.deliveryman.providedServices = req.body.providedServices;
          }
        }

        const user = await newUser.save();

        if (user.isDeliveryMan) {
          sendAdminNotificationEmail(
            'Novo Registo de Motorista Pendente',
            `O motorista <b>${user.name}</b> (Tel: ${user.phoneNumber}) registou-se na plataforma e aguarda aprovação ou conformidade de documentos.<br><br>Por favor, aceda à aba "Motoristas" ou "Validação Doc." no painel de administração para rever os dados.`
          );

          // [NOVO] Emissão global em tempo real via WebSocket para os administradores
          const io = req.app.get('io');
          const usersOnline = req.app.get('users');
          if (io && usersOnline) {
            const admins = usersOnline.filter(u => u.isAdmin && u.socketId);
            admins.forEach(admin => {
              io.to(admin.socketId).emit('adminNotification', {
                type: 'driver_approval',
                message: `Novo registo de motorista pendente: ${user.name}`
              });
            });
          }
        }

        if (user.isSeller) {
          const Provider = mongoose.model('Provider');
          const provider = new Provider({
            ownerId: user._id,
            providerType: 'BUSINESS',
            status: 'active',
            name: user.seller.name,
            categoryId: user.seller.tipoEstabelecimento,
            location: {
              lat: user.seller.latitude,
              lng: user.seller.longitude,
              address: user.seller.address,
              province: user.seller.province
            },
            businessData: {
              logo: user.seller.logo,
              description: user.seller.description,
              openTime: user.seller.opentime || '08:00',
              closeTime: user.seller.closetime || '18:00',
              isOpen: user.seller.openstore || false
            }
          });
          await provider.save();
        }
        return res.send({
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          isAdmin: user.isAdmin,
          isDeliveryMan: user.isDeliveryMan,
          isSeller: user.isSeller,
          isBanned: user.isBanned,
          savedLocations: user.savedLocations || [],
          createdAt: user.createdAt,
          token: generateToken(user),
        });
      }

      res.status(409).send({ message: 'Nmero de registo existente' });
    } catch (error) {
      console.log(error)
      console.error('Erro no registro de usurio:', error);
      res.status(500).send({ message: 'Erro interno no registro' });
    }
  })
);

userRouter.delete(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      // Disable user's products if any
      await Product.updateMany({ seller: user._id }, { $set: { isActive: false } });

      const timestamp = Date.now();

      if (!user.isDeleted) {
        user.email = `deleted_${timestamp}_${user.email}`;
        user.phoneNumber = -timestamp;
      }

      user.isDeleted = true;
      user.isBanned = true;
      user.isApproved = false;
      await user.save();

      res.send({ message: `Conta eliminada com sucesso` });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
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
      await Product.updateMany({ seller: user._id }, { $set: { isActive: false } });

      // Anular o e-mail e telefone para libertar (permitir novo registo futuro com os mesmos dados)
      const timestamp = Date.now();

      // Apenas modificar se não estiver já apagado
      if (!user.isDeleted) {
        user.email = `deleted_${timestamp}_${user.email}`;

        // Se phoneNumber for Numérico no Mongoose, usamos timestamp negativo
        // Se for string, podemos colocar `deleted_...`
        user.phoneNumber = -timestamp;
      }

      user.isDeleted = true;
      user.isBanned = true;
      user.isApproved = false;
      await user.save();

      res.send({ message: `Utilizador removido com sucesso (Soft Delete com libertação de dados)` });
    } else {
      res.status(404).send({ message: 'Utilizador não encontrado' });
    }
  })
);

userRouter.post('/updateDeviceToken', async (req, res) => {
  const { userId, deviceToken } = req.body;
  await User.findByIdAndUpdate(userId, { deviceToken: deviceToken });
  res.send({ success: true });
});


userRouter.put('/updateDeviceToken/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      deviceToken: req.body.deviceToken,
    }, { new: true });

    if (!user) return res.status(404).send({ message: 'Usu�rio n�o encontrado' });

    res.send({ message: 'DeviceToken atualizado com sucesso', user });
  } catch (err) {
    res.status(500).send({ message: 'Erro ao atualizar token' });
  }
});


// Backend: routes/users.js ou semelhante
userRouter.patch('/updatePushToken/:id', async (req, res) => {
  const { id } = req.params;
  const { deviceToken } = req.body;

  try {
    const user = await User.findByIdAndUpdate(id, { deviceToken }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Usu�rio n�o encontrado.' });
    }

    res.status(200).json({ message: 'PushToken atualizado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar PushToken.' });
  }
});


export default userRouter;

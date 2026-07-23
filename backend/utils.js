import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import soap from 'soap';




export const baseUrl = () => process.env.BASE_URL ? process.env.BASE_URL : process.env.NODE_ENV !== 'production' ?
  'http://localhost:3000' : 'https://nhiquelashop.co.mz';


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER || 'nhiquelaservicos@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'kuzw tvds iikq elkx',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com', // Example: 'Gmail', 'Yahoo', 'Outlook'
//   port: 465,
//   secure: true,
//   auth: {
//     user: 'nhiquelaservicosconsultoria@gmail.com',      // Your email address
//     pass: 'trpw julu dkfb hzyb',         // Your email password
//   },
//   tls:{
//     rejectUnauthorized: false
//   }
// });

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
      isDeliveryMan: user.isDeliveryMan,
      roleId: user.roleId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.slice(7, authorization.length);
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'Invalid Token' });
      } else {
        req.user = decode;
        next();
      }
    });
  } else {
    res.status(401).send({ message: 'No token' });
  }
};


export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid admin token' });
  }
}

export const isSeller = (req, res, next) => {
  if (req.user && req.user.isSeller) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid Seller token' });
  }
}
export const isSellerOrAdmin = (req, res, next) => {
  if (req.user && req.user.isSeller || req.user.isAdmin) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid Seller or Admin token' });
  }
}
export const isPartner = (req, res, next) => {
  // Partner and Seller are treated as the same entity
  if (req.user && (req.user.isPartner || req.user.isSeller)) {
    next();
  } else {
    res.status(401).send({ message: 'Invalid partner/seller token' });
  }
};

export const isDeliveryMan = (req, next) => {
  if (req.user && req.user.isDeliveryMan) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid delivery token' });
  }
};

export const sendSMSToSellerUSendIt = async (seller, msgText) => { console.log('USendIt disabled'); }
export const sendSMSToUSendIt = async (req, msgText) => { console.log('USendIt disabled'); }
export const sendSMSToUSendItDeliverman = async (msgText) => { console.log('USendIt disabled'); }
export const sendSMSToUSendItAdmin = async (msgText) => { console.log('USendIt disabled'); }

export const sendEmailOrderStatus = async (req, msg, order, res) => {

  const email = req.user.email

  if (email) {
    const test = 'mauro.patricio1@gmail.com'
    // Email message configuration
    const mailOptions = {
      from: 'nhiquela <nhiquelaservicosconsultoria@gmail.com>',
      to: [test, email],
      subject: `nhiquela - Acompanhamento do Pedido - pedido Nº ${order.code}`,
      text: msg,
    };

    // Enviar email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  } else {
    console.warn('Utilizador sem email configurado');
  }
}



export const sendEmailOrderToAdminAndUser = async (req, msg, order, res) => {

  const email = req.user.email



  if (email) {
    const test = 'nhiquelaservicosconsultoria@gmail.com'
    // Email message configuration
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SOLICITACAO DE RECARGA <noreply@nhiquelaservicos.com>',      // Your email address
      to: [test, email],
      subject: `nhiquela - Acompanhamento do Pedido - pedido Nº ${order.code}`,
      text: msg,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  } else {
    console.warn('Utilizador sem email configurado');
  }
}



export const sendEmailOrderToSeller = async (req, msg, seller, order, res) => {

  const userOrderEmail = req.user.email

  const sellerEmail = seller.email;



  if (userOrderEmail) {
    // Email message configuration
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SOLICITACAO DE RECARGA <noreply@nhiquelaservicos.com>',      // Your email address
      to: [sellerEmail, userOrderEmail],
      subject: `nhiquela - Acompanhamento do Pedido - pedido Nº ${order.code}`,
      text: msg,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  } else {
    console.warn('Utilizador sem email configurado');
  }
}


export const sendEmailOrderStatusToSellerAndDeliver = async (req, msg, seller, order, res) => {

  const userOrderEmail = req.user.email

  const sellerEmail = seller.email;



  if (userOrderEmail) {
    // Email message configuration
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SOLICITACAO DE RECARGA <noreply@nhiquelaservicos.com>',      // Your email address
      to: [sellerEmail, userOrderEmail],
      subject: `nhiquela - Acompanhamento do Pedido - pedido Nº ${order.code}`,
      text: msg,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  } else {
    console.warn('Utilizador sem email configurado');
  }
}

export const sendEmailTopUpRequestAdmin = async (driverName, amount, description, emails, isManual = true) => {
  if (emails && emails.length > 0) {
    const title = isManual ? 'Novo Pedido de Recarga Pendente' : 'Nova Recarga Efetuada';
    const text = isManual
      ? `O motorista <b>${driverName}</b> solicitou uma recarga manual na carteira no valor de <b>${amount} MT</b>.<br><br>Por favor, aceda à aba Financeiro no painel de administração para analisar o comprovativo e aprovar/rejeitar o pedido.`
      : `O motorista <b>${driverName}</b> efetuou com sucesso uma recarga automática na carteira no valor de <b>${amount} MT</b>.`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SOLICITACAO DE RECARGA <noreply@nhiquelaservicos.com>',
      to: emails,
      subject: `Nhiquela - ${title}`,
      html: `<h2>${title}</h2>
             <p>${text}</p>
             <p>Detalhes: ${description}</p>`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('Erro ao enviar email de notificação de recarga:', error);
      } else {
        console.log('Email de notificação enviado:', info.response);
      }
    });
  } else {
    console.log('Nenhum email configurado para notificações financeiras.');
  }
};

import Settings from './models/SettingsModel.js';

export const sendAdminNotificationEmail = async (subject, textHtml) => {
  try {
    const emailSetting = await Settings.findOne({ key: 'admin_notification_emails' });
    let emails = 'mauro.patricio1@gmail.com,nhiquelaservicos@gmail.com';
    if (emailSetting && emailSetting.value) {
      emails = emailSetting.value;
    }

    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);

    if (emailList.length > 0) {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'NHIQUELA NOTIFICAÇÕES <nhiquelaservicos@gmail.com>',
        to: emailList,
        subject: `Nhiquela - ${subject}`,
        html: `<h2>${subject}</h2><p>${textHtml}</p>`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error('Erro ao enviar email de notificação Admin:', error);
        } else {
          console.log('Email de notificação Admin enviado:', info.response);
        }
      });
    }
  } catch (error) {
    console.error('Erro ao buscar emails de notificação:', error);
  }
};



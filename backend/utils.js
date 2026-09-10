import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import soap from 'soap';
import Role from './models/roleModel.js';
import User from './models/UserModel.js';
import Partner from './models/PartnerModel.js';
import Provider from './models/ProviderModel.js';




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
  let role = user.role;
  if (!role) {
    if (user.isAdmin) role = 'ADMIN';
    else if (user.isPartner) role = 'PARTNER';
    else if (user.isOperator) role = 'OPERATOR';
    else if (user.isSeller) role = 'SELLER';
    else if (user.isDeliveryMan) role = 'DRIVER';
    else role = 'CLIENT';
  }

  return jwt.sign(
    {
      _id: user._id || user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: role,
      isAdmin: user.isAdmin || role === 'ADMIN',
      isSeller: user.isSeller || role === 'SELLER',
      isDeliveryMan: user.isDeliveryMan || role === 'DRIVER',
      isOperator: user.isOperator || role === 'OPERATOR',
      isPartner: user.isPartner || role === 'PARTNER',
      partnerId: user.partnerId || null,
      roleId: user.roleId || null,
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
  if (req.user && (req.user.isAdmin || req.user.role === 'ADMIN' || req.user.isOperator || req.user.role === 'OPERATOR')) {
    next();
  } else {
    res.status(403).send({ message: 'Acesso negado. Requer perfil de Administrador.' });
  }
};

export const isOperator = (req, res, next) => {
  if (req.user && (req.user.isOperator || req.user.role === 'OPERATOR' || req.user.isAdmin || req.user.role === 'ADMIN')) {
    next();
  } else {
    res.status(403).send({ message: 'Acesso negado. Requer perfil de Operador ou Admin.' });
  }
};

export const isPartner = (req, res, next) => {
  if (req.user && (req.user.isPartner || req.user.role === 'PARTNER' || req.user.isAdmin || req.user.role === 'ADMIN')) {
    next();
  } else {
    res.status(403).send({ message: 'Acesso negado. Requer perfil de Parceiro.' });
  }
};

export const isSeller = (req, res, next) => {
  if (req.user && (req.user.isSeller || req.user.role === 'SELLER' || req.user.isAdmin || req.user.role === 'ADMIN')) {
    next();
  } else {
    res.status(403).send({ message: 'Acesso negado. Requer perfil de Vendedor.' });
  }
};

export const isSellerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.isSeller || req.user.role === 'SELLER' || req.user.isAdmin || req.user.role === 'ADMIN' || req.user.isPartner || req.user.role === 'PARTNER' || req.user.isOperator || req.user.role === 'OPERATOR')) {
    next();
  } else {
    res.status(403).send({ message: 'Acesso negado. Requer perfil de Vendedor, Parceiro ou Admin.' });
  }
};

export const isDeliveryMan = (req, res, next) => {
  if (req.user && (req.user.isDeliveryMan || req.user.role === 'DRIVER' || req.user.isAdmin || req.user.role === 'ADMIN')) {
    if (typeof next === 'function') next();
  } else {
    if (res && typeof res.status === 'function') {
      res.status(403).send({ message: 'Acesso negado. Requer perfil de Motorista.' });
    }
  }
};

/**
 * Dynamic RBAC Permission Check (Fase 21.7 & 21.9)
 * Checks if the user's role possesses the requested permission code.
 * ADMIN has FULL_ACCESS by default.
 */
export const checkPermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).send({ message: 'Não autenticado.' });
      }

      const userRole = req.user.role || (req.user.isAdmin ? 'ADMIN' : 'CLIENT');

      // Rule 21.9: ADMIN = FULL_ACCESS
      if (userRole === 'ADMIN' || req.user.isAdmin) {
        return next();
      }

      const roleDoc = await Role.findOne({ code: userRole, status: 'Ativo' });

      if (!roleDoc) {
        return res.status(403).send({ message: `Perfil '${userRole}' não possui permissões ativas.` });
      }

      if (roleDoc.permissions && roleDoc.permissions.includes(permissionCode)) {
        return next();
      }

      return res.status(403).send({ message: `Ação não autorizada. Permissão necessária: '${permissionCode}'.` });
    } catch (err) {
      console.error('[Permission Check Error]:', err);
      return res.status(500).send({ message: 'Erro ao verificar permissão.', error: err.message });
    }
  };
};

/**
 * Data Scope Filter Helper (Fase 10 & 21.11)
 * Returns a MongoDB query filter object scoped strictly to the current user's authority.
 */
export const getScopedFilter = async (req, targetType = 'order') => {
  const user = req.user;
  if (!user) return { _id: null };

  const userRole = user.role || (user.isAdmin ? 'ADMIN' : 'CLIENT');

  // ADMIN: Global Access
  if (userRole === 'ADMIN' || user.isAdmin) {
    return {};
  }

  // PARTNER: Access only items belonging to their assigned Drivers or Sellers
  if (userRole === 'PARTNER' || user.isPartner) {
    let pId = user.partnerId;
    if (!pId) {
      const pDoc = await Partner.findOne({ $or: [{ userId: user._id }, { email: user.email }] });
      if (pDoc) pId = pDoc._id;
    }

    if (!pId) return { _id: null };

    const memberUsers = await User.find({ partnerId: pId }).select('_id');
    const memberIds = memberUsers.map(m => m._id);

    if (targetType === 'user' || targetType === 'driver' || targetType === 'seller') {
      return { _id: { $in: memberIds } };
    }

    if (targetType === 'order') {
      const providers = await Provider.find({ userId: { $in: memberIds } }).select('_id');
      const providerIds = providers.map(p => p._id);

      return {
        $or: [
          { seller: { $in: providerIds } },
          { 'deliveryman.id': { $in: [...memberIds, ...providerIds] } },
          { user: { $in: memberIds } }
        ]
      };
    }

    if (targetType === 'requestService') {
      return {
        $or: [
          { targetDriverId: { $in: memberIds } },
          { 'deliveryman.id': { $in: memberIds } },
          { user: { $in: memberIds } }
        ]
      };
    }
  }

  // DRIVER: Access only their own assigned orders / trips
  if (userRole === 'DRIVER' || user.isDeliveryMan) {
    if (targetType === 'user') return { _id: user._id };
    if (targetType === 'order') {
      return { $or: [{ 'deliveryman.id': user._id }, { user: user._id }] };
    }
    if (targetType === 'requestService') {
      return { $or: [{ targetDriverId: user._id }, { 'deliveryman.id': user._id }] };
    }
  }

  // SELLER: Access only their store's orders
  if (userRole === 'SELLER' || user.isSeller) {
    const Provider = (await import('./models/ProviderModel.js')).default;
    const provider = await Provider.findOne({ userId: user._id });
    const pId = provider ? provider._id : user._id;

    if (targetType === 'user') return { _id: user._id };
    if (targetType === 'order') return { seller: pId };
  }

  // CLIENT: Access only their own user record / orders
  if (targetType === 'user') return { _id: user._id };
  return { user: user._id };
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

export const sendEmailSellerApprovalReminderAdmin = async (sellerName) => {
  const adminEmail = 'nhiquelaservicosconsultoria@gmail.com';
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'NOTIFICACAO <noreply@nhiquelaservicos.com>',
    to: adminEmail,
    subject: `Nhiquela - Lembrete de Aprovação: ${sellerName}`,
    html: `<h3>Lembrete de Aprovação de Vendedor</h3><p>O vendedor <b>${sellerName}</b> está aguardando aprovação na plataforma há algum tempo.</p><p>Por favor, acesse o painel de administração para verificar os dados e aprovar a conta.</p>`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
  }
};

export const sendOrderNotificationToSellerEmail = async (sellerEmail, order) => {
  if (!sellerEmail) return;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'nhiquela <noreply@nhiquelaservicos.com>',
    to: sellerEmail,
    subject: `nhiquela - Novo Pedido Recebido Nº ${order.code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #7F00FF; text-align: center;">Novo Pedido Recebido!</h2>
        <p>Olá,</p>
        <p>Você recebeu um novo pedido de compra na plataforma <strong>Nhiquela</strong>. Por favor, aceda à sua aplicação <strong>Nhiquela Seller</strong> para gerir, aceitar ou rejeitar este pedido.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p><strong>Detalhes do Pedido:</strong></p>
        <ul>
          <li><strong>Código do Pedido:</strong> #${order.code}</li>
          <li><strong>Método de Pagamento:</strong> ${order.paymentMethod}</li>
          <li><strong>Valor Total:</strong> ${order.totalPrice.toFixed(2)} MT</li>
        </ul>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://nhiquelashop.co.mz" style="background-color: #7F00FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Aceder ao Painel</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">Este é um e-mail automático, por favor não responda.</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('Error sending seller order email notification:', error);
    } else {
      console.log('Seller order email notification sent:', info.response);
    }
  });
};

export const sendUserBlockStatusEmail = async (email, name, isBanned) => {
  if (!email) return;

  const subject = isBanned 
    ? "nhiquela - A sua conta foi bloqueada" 
    : "nhiquela - A sua conta foi desbloqueada";

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'nhiquela <noreply@nhiquelaservicos.com>',
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${isBanned ? '#DC2626' : '#16A34A'}; text-align: center;">
          ${isBanned ? 'Conta Bloqueada' : 'Conta Desbloqueada'}
        </h2>
        <p>Olá, <strong>${name}</strong>,</p>
        <p>
          ${isBanned 
            ? 'Lamentamos informar que a sua conta na plataforma <strong>Nhiquela</strong> foi suspensa/bloqueada pelo administrador. Se acredita que isto é um erro, por favor contacte o nosso suporte.' 
            : 'Temos o prazer de informar que a sua conta na plataforma <strong>Nhiquela</strong> foi reativada/desbloqueada pelo administrador. Já pode aceder e utilizar todos os nossos serviços.'}
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Este é um e-mail automático, por favor não responda.</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('Error sending block/unblock status email:', error);
    } else {
      console.log('Block/unblock status email sent:', info.response);
    }
  });
};

export const sendNegotiationEmail = async ({ toEmail, recipientName, orderCode, action, amount, note, proposedBy }) => {
  if (!toEmail) return;

  let title = '';
  let color = '#7E22CE';
  let bodyHtml = '';

  if (action === 'PROPOSE') {
    title = `Nova Proposta de Preço: ${amount} MT`;
    color = '#D97706';
    bodyHtml = `
      <p>Olá <strong>${recipientName || 'Cliente/Prestador'}</strong>,</p>
      <p>Foi enviada uma nova proposta de preço para o pedido <strong>#${orderCode}</strong> por <strong>${proposedBy === 'CUSTOMER' ? 'Cliente' : 'Prestador/Motorista'}</strong>.</p>
      <div style="background: #FFFBEB; padding: 15px; border-radius: 8px; border: 1px solid #FCD34D; margin: 15px 0;">
        <h3 style="margin: 0; color: #B45309;">Valor Proposto: ${amount} MT</h3>
        ${note ? `<p style="margin: 5px 0 0 0; color: #78350F;"><em>Nota: "${note}"</em></p>` : ''}
      </div>
      <p>Aceda à aplicação para analisar, aceitar ou enviar uma contra-proposta.</p>
    `;
  } else if (action === 'ACCEPT') {
    title = `Proposta de Preço Aceite! (${amount} MT)`;
    color = '#16A34A';
    bodyHtml = `
      <p>Olá <strong>${recipientName || 'Cliente/Prestador'}</strong>,</p>
      <p>Temos o prazer de informar que a proposta de valor no montante de <strong>${amount} MT</strong> foi <strong>aceite</strong> para o pedido <strong>#${orderCode}</strong>.</p>
      <div style="background: #DCFCE7; padding: 15px; border-radius: 8px; border: 1px solid #86EFAC; margin: 15px 0;">
        <h3 style="margin: 0; color: #15803D;">Valor Acordado Final: ${amount} MT</h3>
      </div>
      <p>O preço do serviço foi atualizado e o serviço pode prosseguir normalmente.</p>
    `;
  } else if (action === 'REJECT') {
    title = `Proposta de Preço Rejeitada`;
    color = '#DC2626';
    bodyHtml = `
      <p>Olá <strong>${recipientName || 'Cliente/Prestador'}</strong>,</p>
      <p>A proposta de valor para o pedido <strong>#${orderCode}</strong> foi <strong>rejeitada</strong>.</p>
      <p>Aceda à aplicação se desejar enviar uma nova proposta dentro do limite de rondas disponíveis.</p>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Nhiquela Serviços <nhiquelaservicos@gmail.com>',
    to: toEmail,
    subject: `Nhiquela - ${title} - Pedido #${orderCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${color}; text-align: center; margin-top: 0;">${title}</h2>
        ${bodyHtml}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Este é um e-mail automático enviado pela plataforma Nhiquela.</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('[Email Negotiation] Erro ao enviar e-mail:', error);
    } else {
      console.log('[Email Negotiation] E-mail enviado com sucesso:', info.response);
    }
  });
};

/**
 * Detects if a text contains phone numbers or contact details (e.g. 841234567, 86 123 4567, +258 85..., etc.)
 */
export const containsPhoneNumber = (text) => {
  if (!text || typeof text !== 'string') return false;

  // 1. Remove common separators (spaces, hyphens, dots, parentheses, underscores, slashes)
  const digitsOnlyText = text.replace(/[\s\-\.\(\)\/\_]/g, '');

  // 2. Any sequence of 8 or more digits
  if (/\d{8,}/.test(digitsOnlyText)) {
    return true;
  }

  // 3. Mozambican phone numbers (82, 83, 84, 85, 86, 87) with optional +258 / 258 prefix
  const mozPhoneRegex = /(?:\+?258)?\s*8[2-7]\d{7}/i;
  if (mozPhoneRegex.test(text)) {
    return true;
  }

  // 4. International phone numbers (+ followed by country code and digits)
  const intlPhoneRegex = /\+\d{1,4}[\s\.\-]?\d{6,14}/;
  if (intlPhoneRegex.test(text)) {
    return true;
  }

  return false;
};

/**
 * Sends digital products, access keys, and instructions to the specified customer or alternative recipient email.
 */
export const sendDigitalKeyDeliveryEmail = async ({ toEmail, recipientName, orderCode, digitalItems }) => {
  if (!toEmail || !digitalItems || digitalItems.length === 0) return;

  const itemsHtml = digitalItems.map(item => `
    <div style="background: #F0FDF4; padding: 15px; border-radius: 8px; border: 1px solid #86EFAC; margin-bottom: 12px;">
      <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 16px;">🔑 ${item.productName || 'Produto Digital'}</h3>
      ${item.key ? `
        <div style="background: #FFFFFF; padding: 10px 14px; border-radius: 6px; border: 1px solid #BBF7D0; margin-bottom: 8px; font-family: monospace; font-size: 16px; font-weight: bold; color: #15803D;">
          ${item.key}
        </div>
      ` : ''}
      ${item.digitalInstructions ? `
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #15803D;">
          💡 <strong>Instruções de Resgate:</strong> ${item.digitalInstructions}
        </p>
      ` : ''}
    </div>
  `).join('');

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Nhiquela Serviços <nhiquelaservicos@gmail.com>',
    to: toEmail,
    subject: `Nhiquela - Acessos Digitais Entregues - Pedido #${orderCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #16A34A; text-align: center; margin-top: 0;">Seus Produtos Digitais Chegaram! 🎉</h2>
        <p>Olá <strong>${recipientName || 'Cliente'}</strong>,</p>
        <p>Confirmamos a disponibilização dos seus acessos/chaves referentes ao pedido <strong>#${orderCode}</strong>:</p>
        ${itemsHtml}
        <p style="font-size: 13px; color: #64748B;">Pode também consultar e copiar todos os acessos diretamente na secção de Pedidos na aplicação Nhiquela.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Este é um e-mail automático enviado pela plataforma Nhiquela.</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('[Email Digital Delivery] Erro ao enviar e-mail:', error);
    } else {
      console.log('[Email Digital Delivery] E-mail enviado com sucesso para:', toEmail, info.response);
    }
  });
};



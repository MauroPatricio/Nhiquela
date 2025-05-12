import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import soap from 'soap';




export const baseUrl = ()=> process.env.BASE_URL ? process.env.BASE_URL : process.env.NODE_ENV !== 'production'?
'http://localhost:3000': 'https://nhiquelashop.co.mz';


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


export const isAdmin=(req, res ,next) =>{
  if (req.user && req.user.isAdmin) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid admin token' });
  }
}

export const isSeller=(req, res ,next) =>{
  if (req.user && req.user.isSeller) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid Seller token' });
  }
}
export const isSellerOrAdmin=(req, res ,next) =>{
  if (req.user && req.user.isSeller || req.user.isAdmin ) {
    next()
  } else {
    res.status(401).send({ message: 'Invalid Seller or Admin token' });
  }
}
export const isDeliveryMan = (req,  next) => {
  if(req.user && req.user.isDeliveryMan){
    next()
  }else {
    res.status(401).send({ message: 'Invalid delivery token' });
  }
};

export const sendSMSToSellerUSendIt = async (seller, msgText) =>{
  const username = "mpatricio";
  const password = "Patrick2019#"
  const timezone = "Africa/Maputo";
  const partnerEventId = "https://api.usendit.co.mz/v2/remoteusendit.asmx";
  const wsdlUrl = 'https://api.usendit.co.mz/v2/remoteusendit.asmx?WSDL';




  const clientPhoneNumber = seller.phoneNumber;
  const concatNumber = '258'+clientPhoneNumber;

  // Definição dos parametros do sendMessage para o pedido the SOAP
  // paramentros de envio para apenas um contacto
  const sendMessageOneContact = {
    username: username,
    password: password,
    timezone: timezone,
    sender: 'Sales Info',
    msisdn: concatNumber,
    mobileOperator: -1, // O valor -1 deixa o sistema inferir o operador automaticamente
    priority: 1,
    messageText: msgText,
    workingDays: false,
    isFlash: false,
  };

    // criar coneccao com o client
    const client = await soap.createClientAsync(wsdlUrl);

    // Chamar a função sendMessage
    client.SendMessage(sendMessageOneContact, (err, result) => {
      if (err) {
        console.error('Error calling sendmessage:', err);
      } else {
        console.log('sendmessage Result:', result);
      }
    });

}
export  const sendSMSToUSendIt= async (req,msgText) =>{

  const username = "mpatricio";
  const password = "Patrick2019#"
  const timezone = "Africa/Maputo";
  const partnerEventId = "https://api.usendit.co.mz/v2/remoteusendit.asmx";
  const wsdlUrl = 'https://api.usendit.co.mz/v2/remoteusendit.asmx?WSDL';


  const clientPhoneNumber = req.user.phoneNumber;

  const concatNumber = '258'+clientPhoneNumber;

  // Definição dos parametros do sendMessage para o pedido the SOAP
  // paramentros de envio para apenas um contacto
  const sendMessageOneContact = {
    username: username,
    password: password,
    timezone: timezone,
    sender: 'Sales Info',
    msisdn: concatNumber,
    mobileOperator: -1, // O valor -1 deixa o sistema inferir o operador automaticamente
    priority: 1,
    messageText: msgText,
    workingDays: false,
    isFlash: false,
  };

    // criar coneccao com o client
    const client = await soap.createClientAsync(wsdlUrl);

    // Chamar a função sendMessage
    client.SendMessage(sendMessageOneContact, (err, result) => {
      if (err) {
        console.error('Error calling sendmessage:', err);
      } else {
        console.log('sendmessage Result:', result);
      }
    });
  }


  export  const sendSMSToUSendItDeliverman= async (msgText) =>{

    const username = "mpatricio";
    const password = "Patrick2019#"
    const timezone = "Africa/Maputo";
    const partnerEventId = "https://api.usendit.co.mz/v2/remoteusendit.asmx";
    const wsdlUrl = 'https://api.usendit.co.mz/v2/remoteusendit.asmx?WSDL';
  
  
     const clientPhoneNumber = 871480518; // Valgy
     //const clientPhoneNumber = 840387051; // Valter 
     

   // const clientPhoneNumber = 840575992;
  
    const concatNumber = '258'+clientPhoneNumber;
  
    // Definição dos parametros do sendMessage para o pedido the SOAP
    // paramentros de envio para apenas um contacto
    const sendMessageOneContact = {
      username: username,
      password: password,
      timezone: timezone,
      sender: 'Sales Info',
      msisdn: concatNumber,
      mobileOperator: -1, // O valor -1 deixa o sistema inferir o operador automaticamente
      priority: 1,
      messageText: msgText,
      workingDays: false,
      isFlash: false,
    };
  
      // criar coneccao com o client
      const client = await soap.createClientAsync(wsdlUrl);
  
      // Chamar a função sendMessage
      client.SendMessage(sendMessageOneContact, (err, result) => {
        if (err) {
          console.error('Error calling sendmessage:', err);
        } else {
          console.log('sendmessage Result:', result);
        }
      });
  }



export  const sendSMSToUSendItAdmin= async (msgText) =>{

  const username = "mpatricio";
  const password = "Patrick2019#"
  const timezone = "Africa/Maputo";
  const partnerEventId = "https://api.usendit.co.mz/v2/remoteusendit.asmx";
  const wsdlUrl = 'https://api.usendit.co.mz/v2/remoteusendit.asmx?WSDL';


   const clientPhoneNumber = 853600036;
 // const clientPhoneNumber = 840575992;

  const concatNumber = '258'+clientPhoneNumber;

  // Definição dos parametros do sendMessage para o pedido the SOAP
  // paramentros de envio para apenas um contacto
  const sendMessageOneContact = {
    username: username,
    password: password,
    timezone: timezone,
    sender: 'Sales Info',
    msisdn: concatNumber,
    mobileOperator: -1, // O valor -1 deixa o sistema inferir o operador automaticamente
    priority: 1,
    messageText: msgText,
    workingDays: false,
    isFlash: false,
  };

    // criar coneccao com o client
    const client = await soap.createClientAsync(wsdlUrl);

    // Chamar a função sendMessage
    client.SendMessage(sendMessageOneContact, (err, result) => {
      if (err) {
        console.error('Error calling sendmessage:', err);
      } else {
        console.log('sendmessage Result:', result);
      }
    });

  


  
  // // Paramentros de envio para varios contactos
  // const sendMessageMultipleContacts = {
  //   username: username,
  //   password: password,
  //   timezone: timezone,
  //   smsList: 
  //       {
  //         Sms: [{
  //     		  Sender: 'Sales Info',
  //           Msisdn: '258840575992',
  //           Priority: 99,
  //           MessageText: msgText,
  //           WorkingDays: false,
  //           IsFlash: false
  //       },
  //       {
  //         	Sender: 'Sales Info',
  //           Msisdn: '258879300036',
  //           Priority: 99,
  //           MessageText: msgText,
  //           WorkingDays: false,
  //           IsFlash: false
  //           }
  //       ],
  //     }
  //   }


  // // criar coneccao com o client
  // const client = await soap.createClientAsync(wsdlUrl);

  // // Chamar a função sendMessage
  // client.SendMessages(sendMessageMultipleContacts, (err, result) => {
  //   if (err) {
  //     console.error('Error calling sendmessage:', err);
  //   } else {
  //     console.log('sendmessage Result:', result);
  //   }
  // });
}

export const sendEmailOrderStatus = async (req, msg, order, res)=>{

  const email = req.user.email



  if(email){
const test ='mauro.patricio1@gmail.com'
// Email message configuration
const mailOptions = {
  from: 'Nhiquela Shop <nhiquelaservicosconsultoria@gmail.com>',      // Your email address
  to: [ test, email],       
  subject: `Nhiquela Shop - Acompanhamento do Pedido - pedido Nº ${order.code}`,                
  text: msg,
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
}



export const sendEmailOrderToAdminAndUser = async (req, msg, order, res)=>{

  const email = req.user.email



  if(email){
const test ='nhiquelaservicosconsultoria@gmail.com'
// Email message configuration
const mailOptions = {
  from: 'mauro.patricio1@gmail.com',      // Your email address
  to: [ test, email],       
  subject: `Nhiquela Shop - Acompanhamento do Pedido - pedido Nº ${order.code}`,                
  text: msg,
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
}



export const sendEmailOrderToSeller = async (req, msg,seller, order, res)=>{

  const userOrderEmail = req.user.email

  const sellerEmail = seller.email;



  if(userOrderEmail){
// Email message configuration
const mailOptions = {
  from: 'mauro.patricio1@gmail.com',      // Your email address
  to: [ sellerEmail, userOrderEmail],       
  subject: `Nhiquela Shop - Acompanhamento do Pedido - pedido Nº ${order.code}`,                
  text: msg,
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
}


export const sendEmailOrderStatusToSellerAndDeliver = async (req, msg, seller, order, res)=>{

  const userOrderEmail = req.user.email

  const sellerEmail = seller.email;



  if(userOrderEmail){
// Email message configuration
const mailOptions = {
  from: 'mauro.patricio1@gmail.com',      // Your email address
  to: [ sellerEmail, userOrderEmail],       
  subject: `Nhiquela Shop - Acompanhamento do Pedido - pedido Nº ${order.code}`,                
  text: msg,
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
}
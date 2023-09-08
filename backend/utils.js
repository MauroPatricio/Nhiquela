import jwt from 'jsonwebtoken';
import soap from 'soap';



export const baseUrl = ()=> process.env.BASE_URL ? process.env.BASE_URL : process.env.NODE_ENV !== 'production'?
'http://localhost:3000': 'https://mydomain.com';

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

export  const sendSMSToUSendIt= async () =>{

  const username = "mpatricio";
  const password = "Patrick2019#"
  const timezone = "Africa/Maputo";
  const partnerEventId = "https://api.usendit.co.mz/v2/remoteusendit.asmx";
  const wsdlUrl = 'https://api.usendit.pt/v2/remoteusendit.asmx?WSDL';



  // Definição dos parametros do sendMessage para o pedido the SOAP
  const sendMessageArgs = {
    username: username,
    password: password,
    partnerEventId: partnerEventId,
    timezone: timezone,
    partnerMsgId: '67890',
    sender: '840575992',
    msisdn: '1234567890',
    mobileOperator: -1, // O valor -1 deixa o sistema inferir o operador automaticamente
    priority: 1,
    messageText: 'hello world',
    workingDays: true,
    isFlash: false,
  };

  // criar coneccao com o client
  const client = await soap.createClientAsync(wsdlUrl);

  // Chamar a função sendMessage
  client.SendMessage(sendMessageArgs, (err, result) => {
    if (err) {
      console.error('Error calling sendmessage:', err);
    } else {
      console.log('sendmessage Result:', result);
    }
  });
}


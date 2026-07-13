import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import NotificationToken from '../models/NotificationToken.js';
import { Expo } from 'expo-server-sdk';
import { sendNotification } from '../utils/sendNotification.js';

const notificationRouter = express.Router();
const expo = new Expo();

// ? Rota para salvar ou atualizar token
notificationRouter.post(
  '/savedevicetoken',
  expressAsyncHandler(async (req, res) => {
    const { deviceToken, userId, platform } = req.body;

    if (!deviceToken || deviceToken === 'null' || deviceToken === null) {
      return res.status(400).json({ message: 'Token inv�lido ou ausente.' });
    }

    const existing = await NotificationToken.findOne({ deviceToken });
    if (existing) {
      return res.status(200).json({ message: 'Token j� registrado.' });
    }

    const newToken = new NotificationToken({
      deviceToken,
      user: userId || null,
      platform: platform || 'android',
    });

    await newToken.save();
    res.status(201).json({ message: 'Token salvo com sucesso.' });
  })
);


// ? Rota para enviar notifica��o
notificationRouter.post('/send', async (req, res) => {
  const { deviceToken, title, body, data } = req.body;

  try {
    const result = await sendNotification(deviceToken, title, body, data);
    if (result.success) {
      res.status(200).json({ message: 'Notifica��o enviada com sucesso.', tickets: result.tickets });
    } else {
      res.status(500).json({ message: 'Erro ao enviar notifica��o.', error: result.error });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


/**
 * Rota: Enviar notifica��o para um usu�rio
 */
notificationRouter.post(
  '/send-to-user',
  expressAsyncHandler(async (req, res) => {
    const { userId, title, body, data } = req.body;


    if (!userId || !title || !body) {
      return res.status(400).json({ message: 'Campos obrigat�rios ausentes.' });
    }

    // Busca todos os tokens associados ao usu�rio (caso o usu�rio use v�rios dispositivos)
    const deviceTokens = await NotificationToken.find({ user: userId });

    if (!deviceTokens.length) {
      console.log('Nenhum token encontrado para este usu�rio. '+ userId)
      // return res.status(404).json({ message: 'Nenhum token encontrado para este usu�rio.' });
    }

    const results = [];
     // Salvar notifica��o no hist�rico do banco
    // await Notification.create({ user: userId, title, body, data });

    for (const tokenObj of deviceTokens) {
      const result = await sendNotification(tokenObj.deviceToken, title, body, data);
      results.push(result);
    }

    res.status(200).json({ message: 'Notifica��es enviadas.', results });
  })
);

/**
 * Enviar notifica��o para todos os tokens registrados
 */
notificationRouter.post(
  '/broadcast',
  expressAsyncHandler(async (req, res) => {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'T�tulo e corpo s�o obrigat�rios.' });
    }

    const deviceTokens = await NotificationToken.find();

    if (!deviceTokens.length) {
      return res.status(404).json({ message: 'Nenhum token encontrado.' });
    }

    const results = [];

    for (const tokenObj of deviceTokens) {
      const result = await sendNotification(tokenObj.deviceToken, title, body, data);
      results.push({ deviceToken: tokenObj.deviceToken, ...result });
    }

    res.status(200).json({
      message: `Notifica��es enviadas para ${deviceTokens.length} dispositivos.`,
      results,
    });
  })
);


export default notificationRouter;

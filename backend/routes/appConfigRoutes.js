import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import AppConfig from '../models/AppConfigModel.js';
import { isAuth, isAdmin } from '../utils.js';

const appConfigRouter = express.Router();

/**
 * GET /api/system/app-config
 * Public endpoint called by apps on startup.
 */
appConfigRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    let config = await AppConfig.findOne();
    if (!config) {
      config = new AppConfig();
      await config.save();
    }
    res.send(config);
  })
);

/**
 * PUT /api/system/app-config
 * Admin endpoint to update the global app configuration.
 */
appConfigRouter.put(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    let config = await AppConfig.findOne();
    if (!config) {
      config = new AppConfig();
    }
    
    // Version Control
    if (req.body.minAppVersionClient !== undefined) config.minAppVersionClient = req.body.minAppVersionClient;
    if (req.body.minAppVersionDriver !== undefined) config.minAppVersionDriver = req.body.minAppVersionDriver;
    if (req.body.appStoreUrlClient !== undefined) config.appStoreUrlClient = req.body.appStoreUrlClient;
    if (req.body.playStoreUrlClient !== undefined) config.playStoreUrlClient = req.body.playStoreUrlClient;
    if (req.body.appStoreUrlDriver !== undefined) config.appStoreUrlDriver = req.body.appStoreUrlDriver;
    if (req.body.playStoreUrlDriver !== undefined) config.playStoreUrlDriver = req.body.playStoreUrlDriver;

    // Maintenance Mode
    if (req.body.isMaintenanceModeClient !== undefined) config.isMaintenanceModeClient = req.body.isMaintenanceModeClient;
    if (req.body.isMaintenanceModeDriver !== undefined) config.isMaintenanceModeDriver = req.body.isMaintenanceModeDriver;
    if (req.body.maintenanceMessage !== undefined) config.maintenanceMessage = req.body.maintenanceMessage;

    // Contacts
    if (req.body.supportWhatsApp !== undefined) config.supportWhatsApp = req.body.supportWhatsApp;
    if (req.body.supportEmail !== undefined) config.supportEmail = req.body.supportEmail;
    if (req.body.termsUrl !== undefined) config.termsUrl = req.body.termsUrl;
    if (req.body.privacyUrl !== undefined) config.privacyUrl = req.body.privacyUrl;

    // Payments
    if (req.body.enabledPaymentMethods !== undefined) config.enabledPaymentMethods = req.body.enabledPaymentMethods;

    await config.save();
    res.send({ message: 'Configurações Globais atualizadas', config });
  })
);

export default appConfigRouter;

import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Province from '../models/ProvinceModel.js';
import User from '../models/UserModel.js';

const statsRouter = express.Router();

statsRouter.get(
  '/landing',
  expressAsyncHandler(async (req, res) => {
    const provincesCount = await Province.countDocuments({ isActive: true });
    const activePartnersCount = await User.countDocuments({ isSeller: true });

    res.send({
      provinces: provincesCount || 11,
      cities: 38, // Placeholder para cidades
      activePartners: activePartnersCount || 142,
    });
  })
);

export default statsRouter;

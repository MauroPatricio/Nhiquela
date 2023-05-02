import express from 'express';
import Product from '../models/ProductModel.js';

import data from '../data.js';
import User from '../models/UserModel.js';

const seedRoutes = express.Router();

seedRoutes.get('/', async (req, res) => {
 await Product.deleteMany({});


 const createProducts = await Product.insertMany(data.products);

  await User.deleteMany({});
  const createUsers = await User.insertMany(data.users);

 res.send({createProducts,createUsers });
});

export default seedRoutes;

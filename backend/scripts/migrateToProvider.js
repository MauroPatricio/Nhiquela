import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Product from '../models/ProductModel.js';
import Order from '../models/OrderModel.js';

dotenv.config();

const migrate = async () => {
  try {
    console.log('A ligar à base de dados...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Ligado com sucesso!');

    const users = await User.find({ $or: [{ isSeller: true }, { isDeliveryMan: true }] });
    console.log(`Encontrados ${users.length} utilizadores com perfil de seller ou deliveryman.`);

    for (const user of users) {
      if (user.isSeller && user.seller && user.seller.name) {
        let provider = await Provider.findOne({ ownerId: user._id, providerType: 'BUSINESS' });
        if (!provider) {
          console.log(`A migrar Seller: ${user.seller.name}`);
          provider = new Provider({
            ownerId: user._id,
            providerType: 'BUSINESS',
            name: user.seller.name,
            categoryId: user.seller.tipoEstabelecimento,
            status: user.isApproved ? 'active' : 'pending',
            location: {
              lat: user.seller.latitude,
              lng: user.seller.longitude,
              address: user.seller.address,
              province: user.seller.province
            },
            businessData: {
              logo: user.seller.logo,
              description: user.seller.description,
              openTime: user.seller.opentime,
              closeTime: user.seller.closetime,
              isOpen: user.seller.openstore
            }
          });
          await provider.save();
          
          // Migrate Products
          await Product.updateMany({ seller: user._id }, { seller: provider._id });
          console.log(`- Produtos atualizados para Provider._id`);
          
          // Migrate Orders
          await Order.updateMany({ seller: user._id }, { seller: provider._id });
        }
      }
      
      if (user.isDeliveryMan && user.deliveryman && user.deliveryman.name) {
        let provider = await Provider.findOne({ ownerId: user._id, providerType: 'SERVICE' });
        if (!provider) {
          console.log(`A migrar DeliveryMan: ${user.deliveryman.name}`);
          provider = new Provider({
            ownerId: user._id,
            providerType: 'SERVICE',
            name: user.deliveryman.name,
            status: 'active',
            businessData: {
              description: `${user.deliveryman.transport_type} - ${user.deliveryman.transport_registration}`
            }
          });
          await provider.save();
        }
      }
    }

    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
};

migrate();

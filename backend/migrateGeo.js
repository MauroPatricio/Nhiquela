import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/UserModel.js';

dotenv.config();

const migrateLocations = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela');
        console.log('Conectado à BD. A migrar localizações...');

        const users = await User.find({ latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } });

        let count = 0;
        for (const user of users) {
            const lat = parseFloat(user.latitude);
            const lng = parseFloat(user.longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
                user.locationGeo = {
                    type: 'Point',
                    coordinates: [lng, lat] // [longitude, latitude] em MongoDB
                };
                await user.save();
                count++;
            }
        }

        console.log(`Migração concluída! ${count} utilizadores atualizados.`);
        process.exit(0);
    } catch (err) {
        console.error('Erro na migração:', err);
        process.exit(1);
    }
};

migrateLocations();

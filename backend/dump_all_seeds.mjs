import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

const modelsToDump = [
  { modelFile: 'ProviderTypeModel.js', exportName: 'providerTypesData' },
  { modelFile: 'VehicleTypeModel.js', exportName: 'vehicleTypesData' },
  { modelFile: 'ProvinceModel.js', exportName: 'provincesData' },
  { modelFile: 'SettingsModel.js', exportName: 'settingsData' },
  { modelFile: 'AppConfigModel.js', exportName: 'appConfigsData' },
  { modelFile: 'ProviderClassificationModel.js', exportName: 'providerClassificationsData' },
  { modelFile: 'PricingEngineModel.js', exportName: 'pricingEnginesData' },
  { modelFile: 'VehicleColorModel.js', exportName: 'vehicleColorsData' },
  { modelFile: 'ColorModel.js', exportName: 'colorsData' },
];

async function dump() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const item of modelsToDump) {
      const { default: Model } = await import(`./models/${item.modelFile}`);
      const data = await Model.find();
      const filename = `seeds/${item.exportName.replace('Data', '')}.js`;
      const fileContent = `export default ${JSON.stringify(data, null, 2)};\n`;
      fs.writeFileSync(filename, fileContent);
      console.log(`Dumped ${data.length} documents into ${filename}`);
    }

    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error dumping data:', error);
  }
}

dump();

// Migration to add default driver commission rate (15%) in Settings
import Settings from '../models/SettingsModel.js';

module.exports = async function (db) {
  // Check if setting already exists
  const exists = await Settings.findOne({ key: 'driverCommissionRate' });
  if (!exists) {
    const setting = new Settings({
      key: 'driverCommissionRate',
      value: 0.15,
      description: 'Base commission rate for delivery drivers (15%)',
      type: 'number',
    });
    await setting.save();
    console.log('Driver commission setting created');
  } else {
    console.log('Driver commission setting already exists');
  }
};

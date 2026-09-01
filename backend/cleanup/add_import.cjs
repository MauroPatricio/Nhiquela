const fs = require('fs');
let c = fs.readFileSync('services/walletService.js', 'utf8');

if (!c.includes("import VehicleType")) {
  c = c.replace(
    "import PricingEngine from '../models/PricingEngineModel.js';",
    "import PricingEngine from '../models/PricingEngineModel.js';\nimport VehicleType from '../models/VehicleTypeModel.js';"
  );
  fs.writeFileSync('services/walletService.js', c, 'utf8');
  console.log('Added import');
} else {
  console.log('Import already exists');
}

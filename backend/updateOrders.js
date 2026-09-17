const fs = require('fs');
let code = fs.readFileSync('routes/orderRoutes.js', 'utf8');

const helper = `
const getProviderIdFromSellerQuery = async (sellerQuery) => {
  if (!sellerQuery) return '';
  const mongoose = require('mongoose');
  const provider = await mongoose.model('Provider').findOne({ ownerId: sellerQuery });
  return provider ? provider._id : sellerQuery;
};
`;

if (!code.includes('getProviderIdFromSellerQuery')) {
  code = code.replace('const orderRouter = express.Router();', 'const orderRouter = express.Router();\\n' + helper);
}

code = code.replace(/const seller = req\.query\.seller \|\| '';/g, 'const sellerQuery = req.query.seller || \\'\\';\\n    const seller = await getProviderIdFromSellerQuery(sellerQuery);');

fs.writeFileSync('routes/orderRoutes.js', code);

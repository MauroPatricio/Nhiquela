const fs = require('fs');

function patchFile(filepath, target, replacement) {
    let content = fs.readFileSync(filepath, 'utf8');
    if (content.includes(target) && !content.includes('currentUser.blockedUntil')) {
        content = content.replace(target, replacement);
        fs.writeFileSync(filepath, content);
        console.log(`Patched ${filepath} successfully!`);
    } else {
        console.log(`Could not patch ${filepath} or already patched.`);
    }
}

// Patch orderRoutes.js
const orderRoutesPath = 'routes/orderRoutes.js';
const orderTarget = `orderRouter.post('/', isAuth, expressAsyncHandler(async (req, res) => {
    const priceFromSeller = parseFloat(req.body.itemsPriceForSeller);`;
const orderReplacement = `orderRouter.post('/', isAuth, expressAsyncHandler(async (req, res) => {
    // Check for cancellation penalty block
    const currentUser = await User.findById(req.user._id);
    if (currentUser && currentUser.blockedUntil && currentUser.blockedUntil > new Date()) {
      return res.status(403).send({ message: "Conta bloqueada por 30 dias devido a cancelamentos sucessivos sem justificação válida." });
    }

    const priceFromSeller = parseFloat(req.body.itemsPriceForSeller);`;
patchFile(orderRoutesPath, orderTarget, orderReplacement);

// Patch requestServiceRoutes.js
const reqDeliverPath = 'routes/requestServiceRoutes.js';
const reqTarget = `requestServiceRouter.post('/', isAuth, expressAsyncHandler(async (req, res) => {
    
    // Configurar as opções para o cálculo de rotas`;
const reqReplacement = `requestServiceRouter.post('/', isAuth, expressAsyncHandler(async (req, res) => {
    // Check for cancellation penalty block
    const currentUser = await User.findById(req.user._id);
    if (currentUser && currentUser.blockedUntil && currentUser.blockedUntil > new Date()) {
      return res.status(403).send({ message: "Conta bloqueada por 30 dias devido a cancelamentos sucessivos sem justificação válida." });
    }
    
    // Configurar as opções para o cálculo de rotas`;
patchFile(reqDeliverPath, reqTarget, reqReplacement);

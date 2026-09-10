const fs = require('fs');

let c = fs.readFileSync('routes/driverRoutes.js', 'utf8');

const targetCheck = `        if (availability === 'active') {
          const { hasSufficientBalance } = await import('../services/walletService.js');
          const canGoOnline = await hasSufficientBalance(req.user._id);
          console.log('canGoOnline result:', canGoOnline);
          if (!canGoOnline) {
            return res.status(402).send({ message: 'Saldo insuficiente. FaA a um recarregamento para voltar a receber pedidos.' });
          }
        }`;

const newCheck = `        if (availability === 'active') {
          const driverCheck = await User.findById(req.user._id);
          if (!driverCheck.deliveryman || !driverCheck.deliveryman.providedServices || driverCheck.deliveryman.providedServices.length === 0) {
            return res.status(403).send({ message: 'VocA precisa estar associado a pelo menos um serviA o antes de ficar online. Por favor, atualize o seu perfil.' });
          }

          const { hasSufficientBalance } = await import('../services/walletService.js');
          const canGoOnline = await hasSufficientBalance(req.user._id);
          console.log('canGoOnline result:', canGoOnline);
          if (!canGoOnline) {
            return res.status(402).send({ message: 'Saldo insuficiente. FaA a um recarregamento para voltar a receber pedidos.' });
          }
        }`;

if (c.includes(targetCheck)) {
    c = c.replace(targetCheck, newCheck);
    fs.writeFileSync('routes/driverRoutes.js', c, 'utf8');
    console.log('Patched /availability with service check');
} else {
    console.log('Could not find target block to patch /availability');
}

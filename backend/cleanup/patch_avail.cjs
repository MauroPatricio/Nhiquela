const fs = require('fs');

let c = fs.readFileSync('routes/driverRoutes.js', 'utf8');

// We will locate the router.put('/availability', ...) block and replace it entirely to avoid any syntax errors
const targetStr = `router.put(
    '/availability',
    isAuth,
    expressAsyncHandler(async (req, res) => {`;

const newStr = `router.put(
    '/availability',
    isAuth,
    expressAsyncHandler(async (req, res) => {
      console.log('--- AVAILABILITY REQUEST INITIATED ---');
      try {
        const { availability } = req.body;
        console.log('Requested availability:', availability, 'for user:', req.user._id);
        
        if (!['active', 'paused', 'inactive'].includes(availability)) {
          return res.status(400).send({ message: 'Status de disponibilidade inválido.' });
        }
    
        if (availability === 'active') {
          const { hasSufficientBalance } = await import('../services/walletService.js');
          const canGoOnline = await hasSufficientBalance(req.user._id);
          console.log('canGoOnline result:', canGoOnline);
          if (!canGoOnline) {
            return res.status(402).send({ message: 'Saldo insuficiente. Faça um recarregamento para voltar a receber pedidos.' });
          }
        }
    
        const driver = await User.findById(req.user._id);
        if (driver) {
          if (availability === 'active' && driver.status === 'Inativo') {
             return res.status(403).send({ message: 'A sua conta encontra-se suspensa. Contacte o suporte ou recarregue o seu saldo.' });
          }
    
          driver.availability = availability;
          await driver.save();
          
          try {
            const io = req.app.get('io');
            if (io && driver.status) {
              io.to(\`driver_\${driver._id}\`).emit('driver_status_updated', {
                status: driver.status,
                availability: driver.availability
              });
            }
          } catch (e) { console.error('Socket emit error:', e); }

          console.log('Availability successfully changed to', driver.availability);
          res.send({ message: 'Disponibilidade atualizada com sucesso', availability: driver.availability });
        } else {
          res.status(404).send({ message: 'Motorista não encontrado' });
        }
      } catch (err) {
        console.error('CRITICAL ERROR IN AVAILABILITY ROUTE:', err);
        res.status(500).send({ message: 'Internal Server Error: ' + err.message });
      }
      return; // end of patched block
  `;

// Wait, the previous block in driverRoutes.js goes until:
/*
      } else {
        res.status(404).send({ message: 'Motorista nAo encontrado' });
      }
    })
  );
*/

// I need to use regex to replace the entire route cleanly.
c = c.replace(/router\.put\(\s*'\/availability',[\s\S]*?res\.status\(404\)\.send\(\{ message: 'Motorista n[aA]o encontrado' \}\);\s*\}\s*\}\)\s*\);/m, newStr + '  })\n);');

fs.writeFileSync('routes/driverRoutes.js', c, 'utf8');
console.log('Replaced availability route safely');

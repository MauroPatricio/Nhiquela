const fs = require('fs');
const path = 'd:/Projectos/Nhiquela/nhiqueladriver/src/screens/ProfileScreen.tsx';
let t = fs.readFileSync(path, 'utf8');

t = t.replace(/âÅ“â€¦/g, '✅');
t = t.replace(/Aprovação/g, 'Aprovação');
t = t.replace(/Não/g, 'Não');
t = t.replace(/criação/g, 'criação');
t = t.replace(/Estatísticas/g, 'Estatísticas');
t = t.replace(/FUNÇÃO/g, 'FUNÇÃO');
t = t.replace(/Configurações/g, 'Configurações');
t = t.replace(/Notificações/g, 'Notificações');
t = t.replace(/Condições/g, 'Condições');
t = t.replace(/Política/g, 'Política');
t = t.replace(/Veículo/g, 'Veículo');

fs.writeFileSync(path, t, 'utf8');
console.log('Done');

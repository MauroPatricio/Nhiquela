const fs = require('fs');
const path = 'd:/Projectos/Nhiquela/nhiqueladriver/src/screens/ProfileScreen.tsx';
let t = fs.readFileSync(path, 'utf8');

t = t.replace(/Ã¢Å“â€¦/g, '✅');
t = t.replace(/AprovaÃ§Ã£o/g, 'Aprovação');
t = t.replace(/NÃ£o/g, 'Não');
t = t.replace(/criaÃ§Ã£o/g, 'criação');
t = t.replace(/EstatÃ­sticas/g, 'Estatísticas');
t = t.replace(/FUNÃ‡ÃƒO/g, 'FUNÇÃO');
t = t.replace(/ConfiguraÃ§Ãµes/g, 'Configurações');
t = t.replace(/NotificaÃ§Ãµes/g, 'Notificações');
t = t.replace(/CondiÃ§Ãµes/g, 'Condições');
t = t.replace(/PolÃ­tica/g, 'Política');
t = t.replace(/VeÃ­culo/g, 'Veículo');

fs.writeFileSync(path, t, 'utf8');
console.log('Done');

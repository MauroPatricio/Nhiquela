const fs = require('fs');
let c = fs.readFileSync('screens/RequestService.jsx', 'utf8');
// Fix escaped backticks and dollars
c = c.replace(/\\\\\`/g, '\`');
c = c.replace(/\\\\\$/g, '$');
c = c.replace(/\\\`/g, '\`');
c = c.replace(/\\\$/g, '$');
c = c.replace(/Motoristas Disponveis/g, 'Motoristas Disponíveis');
c = c.replace(/Nenhum motorista disponvel/g, 'Nenhum motorista disponível');
c = c.replace(/Aguardando confirmaao/g, 'Aguardando confirmação');
c = c.replace(/nao pde/g, 'não pôde');
c = c.replace(/Motorista Indisponvel/g, 'Motorista Indisponível');
fs.writeFileSync('screens/RequestService.jsx', c);
console.log('Fixed escaped chars in RequestService.jsx');

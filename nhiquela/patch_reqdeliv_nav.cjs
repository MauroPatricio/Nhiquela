const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'screens', 'RequestService.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\/\/ Navegar para detalhes do pedido com o primeiro motorista disponivel\s*navigation\.navigate\('Pedidos'\);/g;

if (regex.test(content)) {
    content = content.replace(regex, "sendRequestToDriver(drivers[0]);");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced navigation.navigate with sendRequestToDriver!');
} else {
    console.log('Regex did not match.');
}

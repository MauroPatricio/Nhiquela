const fs = require('fs');

const filesToUpdate = [
  'd:\\Projectos\\Nhiquela\\nhiqueladriver\\app.json',
  'd:\\Projectos\\Nhiquela\\nhiquela\\android\\app\\src\\main\\AndroidManifest.xml',
  'd:\\Projectos\\Nhiquela\\nhiqueladriver\\android\\app\\src\\main\\AndroidManifest.xml'
];

const oldKey = 'AIzaSyBAy0m_iw47ZF9NcH31AGaE3lfuEhrlKlE';
const newKey = 'AIzaSyBipLnxa_lqw1IUKqQovRe_oQpeVvjGZ4s';

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldKey)) {
      content = content.replace(new RegExp(oldKey, 'g'), newKey);
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    } else {
      console.log(`Key not found in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

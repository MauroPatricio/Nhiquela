const fs = require('fs');
const path = require('path');

const apps = ['nhiquela', 'nhiqueladriver', 'nhiquelaweb', 'nhiquelaseller', 'backend'];
const replacements = [
  { bad: 'localizaA Ao', good: 'localização' },
  { bad: 'conexAo', good: 'conexão' },
  { bad: 'â Œ', good: '❌' },
  { bad: 'criaA Ao', good: 'criação' },
  { bad: 'opA Ao', good: 'opção' },
  { bad: 'informaA Ao', good: 'informação' },
  { bad: 'InformaA Ao', good: 'Informação' },
  { bad: 'atualizaA Ao', good: 'atualização' },
  { bad: 'notificaA Ao', good: 'notificação' },
  { bad: 'DisponA-vel', good: 'Disponível' },
  { bad: 'DisponA-veis', good: 'Disponíveis' },
  { bad: 'AprovaA Ao', good: 'Aprovação' },
  { bad: 'AprovaA Ao', good: 'Aprovação' },
  { bad: 'serviA o', good: 'serviço' },
  { bad: 'serviA os', good: 'serviços' },
  { bad: 'alteraA Ao', good: 'alteração' },
  { bad: 'preA o', good: 'preço' },
  { bad: 'seguranA a', good: 'segurança' },
  { bad: 'rApida', good: 'rápida' },
  { bad: 'prA3ximos', good: 'próximos' },
  { bad: 'contA-nua', good: 'contínua' },
  { bad: 'necessAria', good: 'necessária' },
];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const { bad, good } of replacements) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed accents in ${fullPath}`);
      }
    }
  }
}

apps.forEach(app => {
  const dir = path.join(__dirname, app);
  console.log(`Checking ${app}...`);
  processDirectory(dir);
});
console.log('Done!');

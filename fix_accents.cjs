const fs = require('fs');
const path = require('path');

const replacements = {
  // Corrupted strings
  'PreferÃªncias': 'Preferências',
  'â Œ': '❌',
  'FUNÃƒâ€¡ÃƒÆ’O': 'FUNÇÃO',
  'Ã¢Â Å’': '❌',
  'Ã°Å¸â€ Â¥': '🔥',
  'VEÃƒÂ CULO': 'VEÍCULO',
  'BOTÃƒÆ’O': 'BOTÃO',
  'DisponÃ­vel': 'Disponível',
  'MÃ­n.': 'Mín.',
  'Ã³': 'ó',
  'Ã§': 'ç',
  'Ã£': 'ã',
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ãº': 'ú',
  'Ãª': 'ê',
  'Ã¢': 'â',
  'Ãµ': 'õ',
  'Ã§Ã£o': 'ção',
  
  // Unaccented common words
  'Nao ': 'Não ',
  'nao ': 'não ',
  ' endereco': ' endereço',
  'Endereco': 'Endereço',
  'veiculo': 'veículo',
  'Veiculo': 'Veículo',
  'cartao': 'cartão',
  'Cartao': 'Cartão',
  'codigo': 'código',
  'Codigo': 'Código',
  'aprovacao': 'aprovação',
  'Aprovacao': 'Aprovação',
  'usuario': 'usuário',
  'Usuario': 'Usuário',
  'historico': 'histórico',
  'Historico': 'Histórico',
  'distancia': 'distância',
  'Distancia': 'Distância',
  'concluido': 'concluído',
  'Concluido': 'Concluído',
  'concluida': 'concluída',
  'Concluida': 'Concluída',
  'atencao': 'atenção',
  'Atencao': 'Atenção',
  'Ola,': 'Olá,',
  'ola,': 'olá,',
  ' podera ': ' poderá ',
  ' nr ': ' nº ',
  'Aplicacao': 'Aplicação',
  'aplicacao': 'aplicação'
};

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.expo' || file === 'build' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file) && !file.includes('fix_accents')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Corrigido: ${fullPath}`);
      }
    }
  }
}

console.log('Iniciando correção global de acentos...');
processDirectory('d:\\Projectos\\Nhiquela\\backend');
processDirectory('d:\\Projectos\\Nhiquela\\nhiquelaseller');
processDirectory('d:\\Projectos\\Nhiquela\\nhiquelaweb\\src');
processDirectory('d:\\Projectos\\Nhiquela\\nhiqueladriver\\src');
processDirectory('d:\\Projectos\\Nhiquela\\nhiquela');
console.log('Correção global concluída!');

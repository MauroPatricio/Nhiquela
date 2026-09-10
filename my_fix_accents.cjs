const fs = require('fs');
const path = require('path');

const replacements = {
    // Double mangled
    'ÃƒÂ­': 'í',
    'ÃƒÂ§ÃƒÂ£o': 'ção',
    'ÃƒÂ§ÃƒÂµes': 'ções',
    'ÃƒÂª': 'ê',
    'ÃƒÂ¡': 'á',
    'ÃƒÂ£': 'ã',
    'ÃƒÂ©': 'é',
    'ÃƒÂ³': 'ó',
    'ÃƒÂ§': 'ç',
    'ÃƒÂ¢': 'â',
    'Ã¢Â Å’': '❌',
    'Ã°Å¸â€ Â¥': '⭐',

    // Specific full words from the python script to be safe
    'AprovaÃ§Ã£o': 'Aprovação',
    'criaÃ§Ã£o': 'criação',
    'VeÃ­culo': 'Veículo',
    'NÃ£o': 'Não',
    'sensaÃ§Ã£o': 'sensação',
    'preferÃªncias': 'preferências',
    'possÃ­vel': 'possível',
    'FUNÃ‡ÃƒO': 'FUNÇÃO',
    'nÃ£o': 'não',
    'EstatÃ­sticas': 'Estatísticas',
    'AceitaÃ§Ã£o': 'Aceitação',
    'AvaliaÃ§Ã£o': 'Avaliação',
    'NÃ­vel': 'Nível',
    'VEÃ CULO': 'VEÍCULO',
    'PreÃ§o': 'Preço',
    'PadrÃ£o': 'Padrão',
    'BOTÃƒO': 'BOTÃO',
    'AnÃ¡lise': 'Análise',
    'informaÃ§Ãµes': 'informações',
    'histÃ³rico': 'histórico',
    'SeguranÃ§a': 'Segurança',
    'disponÃ­vel': 'disponível',
    'prÃ³xima': 'próxima',
    'atualizaÃ§Ã£o': 'atualização',
    'VersÃ£o': 'Versão',
    'ConduÃ§Ã£o': 'Condução',
    'InspeÃ§Ã£o': 'Inspeção',
    'sessÃ£o': 'sessão',
    'DeixarÃ¡': 'Deixará',
    'atÃ©': 'até',
    
    // Fallbacks (Single characters)
    'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã',
    'Ã©': 'é', 'Ãª': 'ê',
    'Ã­': 'í',
    'Ã³': 'ó', 'Ã´': 'ô', 'Ãµ': 'õ',
    'Ãº': 'ú',
    'Ã§': 'ç',
    'Ã‡': 'Ç',
    'Ã€': 'À', 'Ã ': 'Á', 'Ã‚': 'Â', 'Ãƒ': 'Ã',
    'Ã‰': 'É', 'ÃŠ': 'Ê',
    'Ã ': 'Í',
    'Ã“': 'Ó', 'Ã”': 'Ô', 'Ã•': 'Õ',
    'Ãš': 'Ú',
    
    // Others
    'ðŸ” ': '🔍',
    'ðŸ”¥': '🔥',
    'âš ï¸ ': '⚠️',
    'â Œ': '❌',
    'Ã§Ãµes': 'ções',
    'Ã§Ã£o': 'ção',
    'Ã§Ãµ': 'çõ',
    'Ã§Ã£': 'çã'
};

const directories = ['nhiquela', 'nhiqueladriver', 'backend', 'nhiquelaweb'];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build' && file !== '.expo') {
                processDirectory(fullPath);
            }
        } else {
            if (fullPath.match(/\.(js|jsx|ts|tsx|json)$/)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let modified = false;
                
                for (const [bad, good] of Object.entries(replacements)) {
                    if (content.includes(bad)) {
                        content = content.split(bad).join(good);
                        modified = true;
                    }
                }
                
                if (modified) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`Corrigido: ${fullPath}`);
                }
            }
        }
    }
}

directories.forEach(dir => processDirectory(path.join(__dirname, dir)));
console.log('Concluído!');

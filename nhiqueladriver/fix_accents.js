const fs = require('fs');
let text = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');

const replacements = {
  'Aprovaao': 'Aprovação',
  'criaao': 'criação',
  'Veculo': 'Veículo',
  'Nao': 'Não',
  'sensaA Ao': 'sensação',
  'preferAncias': 'preferências',
  'possA-vel': 'possível',
  'FUNA?A\'O': 'FUNÇÃO',
  'nAAo': 'não',
  'AAc': 'é',
  'AA?\'': '❌',
  'A,??A': '⭐',
  'EstatAA-sticas': 'Estatísticas',
  'AceitaAA AAo': 'Aceitação',
  'AvaliaAA AAo': 'Avaliação',
  'NAA-vel': 'Nível',
  'VEAA?CULO': 'VEÍCULO',
  'VeAA-culo': 'Veículo',
  'PreAA o': 'Preço',
  'PadrAAo': 'Padrão',
  'BOTA\'O': 'BOTÃO',
  'AnAAlise': 'Análise',
  'informaAA AAes': 'informações',
  'histAA3rico': 'histórico',
  'SeguranAA a': 'Segurança',
  'disponAAvel': 'disponível',
  'prAA3xima': 'próxima',
  'atualizaAA AAo': 'atualização',
  'VersAAo': 'Versão',
  'ConduAA AAo': 'Condução',
  'InspeAA AAo': 'Inspeção',
  'sessAAo': 'sessão',
  'DeixarAA': 'Deixará',
  'atAAc': 'até',
  'DisponA-vel': 'Disponível'
};

for (const [key, value] of Object.entries(replacements)) {
  text = text.split(key).join(value);
}

fs.writeFileSync('src/screens/ProfileScreen.tsx', text, 'utf8');

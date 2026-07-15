const fs = require('fs');
let text = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');

const replacements = {
  'Aprovaao': 'Aprovação',
  'criaao': 'criação',
  'Veculo': 'Veículo',
  'Nao': 'Não',
  'sensação': 'sensação',
  'preferAncias': 'preferências',
  'possA-vel': 'possível',
  'FUNA?A\'O': 'FUNÇÃO',
  'nAAo': 'não',
  'AAc': 'é',
  'AA?\'': '❌',
  'A,??A': '⭐',
  'EstatAA-sticas': 'Estatísticas',
  'AceitaAçãAo': 'Aceitação',
  'AvaliaAçãAo': 'Avaliação',
  'NAA-vel': 'Nível',
  'VEAA?CULO': 'VEÍCULO',
  'VeAA-culo': 'Veículo',
  'PreAão': 'Preço',
  'PadrAAo': 'Padrão',
  'BOTA\'O': 'BOTÃO',
  'AnAAlise': 'Análise',
  'informaAçãAes': 'informações',
  'histAA3rico': 'histórico',
  'SeguranAA a': 'Segurança',
  'disponAAvel': 'disponível',
  'prAA3xima': 'próxima',
  'atualizaAçãAo': 'atualização',
  'VersAAo': 'Versão',
  'ConduAçãAo': 'Condução',
  'InspeAçãAo': 'Inspeção',
  'sessAAo': 'sessão',
  'DeixarAA': 'Deixará',
  'atAAc': 'até',
  'DisponA-vel': 'Disponível'
};

for (const [key, value] of Object.entries(replacements)) {
  text = text.split(key).join(value);
}

fs.writeFileSync('src/screens/ProfileScreen.tsx', text, 'utf8');

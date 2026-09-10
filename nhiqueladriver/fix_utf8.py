import os

file_path = r'd:\Projectos\Nhiquela\nhiqueladriver\src\screens\ProfileScreen.tsx'

with open(file_path, 'r', encoding='utf8') as f:
    text = f.read()

replacements = {
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
    'AprovaÃ§Ã£o': 'Aprovação',
    'criaÃ§Ã£o': 'criação',
    'VeÃ­culo': 'Veículo',
    'NÃ£o': 'Não',
    'sensaÃ§Ã£o': 'sensação',
    'preferÃªncias': 'preferências',
    'possÃ­vel': 'possível',
    'FUNÃ‡ÃƒO': 'FUNÇÃO',
    'nÃ£o': 'não',
    'Ã©': 'é',
    'EstatÃ­sticas': 'Estatísticas',
    'AceitaÃ§Ã£o': 'Aceitação',
    'AvaliaÃ§Ã£o': 'Avaliação',
    'NÃ­vel': 'Nível',
    'VEÃCULO': 'VEÍCULO',
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
    'atÃ©': 'até'
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open(file_path, 'w', encoding='utf8') as f:
    f.write(text)

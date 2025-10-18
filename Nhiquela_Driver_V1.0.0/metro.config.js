const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// A configuração padrão do Expo já inclui todas as extensões de imagem
// Não é necessário adicionar manualmente

module.exports = config;
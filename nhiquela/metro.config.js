const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * MOCKS para módulos nativos não compilados no dev client.
 *
 * Cada entrada substitui um import por um mock JS puro,
 * evitando crashes ao carregar a app sem rebuild Android.
 *
 * Para adicionar um novo módulo problemático:
 *   'nome-do-pacote': path.resolve(__dirname, 'mocks', 'nome-do-mock.js'),
 */
const MOCKS = {
  // Keep-awake: TurboModule 'ReactNativeKCKeepAwake' not found
  '@sayem314/react-native-keep-awake': path.resolve(__dirname, 'mocks', 'keep-awake.js'),

  // Sound: RNSound NativeModule not linked
  'react-native-sound':               path.resolve(__dirname, 'mocks', 'sound.js'),

  // Encrypted Storage: RNEncryptedStorage is undefined (usa AsyncStorage como backend)
  'react-native-encrypted-storage':   path.resolve(__dirname, 'mocks', 'encrypted-storage.js'),

  // WebRTC: WebRTCModule not found (Zegocloud usa SDK próprio para vídeo)
  'react-native-webrtc':              path.resolve(__dirname, 'mocks', 'webrtc.js'),
};

config.resolver.resolveRequest = function (context, moduleName, platform) {
  // Interceta imports de pacotes nativos problemáticos
  if (MOCKS[moduleName]) {
    return { filePath: MOCKS[moduleName], type: 'sourceFile' };
  }
  // Interceta ficheiro interno do keep-awake
  if (moduleName.endsWith('NativeKCKeepAwake')) {
    return { filePath: MOCKS['@sayem314/react-native-keep-awake'], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Remover unstable_workerThreads para evitar warning de validação no EAS
if (config.watcher && config.watcher.unstable_workerThreads !== undefined) {
  delete config.watcher.unstable_workerThreads;
}

module.exports = config;

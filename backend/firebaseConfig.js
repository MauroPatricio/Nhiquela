const admin = require('firebase-admin');
const path = require('path');

// Caminho para o ficheiro JSON do Service Account na raiz do projeto
const serviceAccountPath = path.resolve(__dirname, '../nhiquela-86832-firebase-adminsdk-fbsvc-0bf1a6413d.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('[Firebase Admin] Inicializado com sucesso!');
} catch (error) {
  console.error('[Firebase Admin] Erro ao inicializar. Verifique se o ficheiro serviceAccount existe:', error.message);
}

module.exports = admin;

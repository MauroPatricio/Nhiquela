
import admin from 'firebase-admin';

import serviceAccount from './firebase-nhiquela-plus.js';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
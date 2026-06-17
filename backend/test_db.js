const admin = require('./firebaseConfig');
const db = admin.firestore();
async function test() {
  try {
    const s = await db.collection('users').get();
    console.log("Success! Docs:", s.docs.length);
  } catch(e) {
    console.error("Firestore Error:", e);
  }
}
test();

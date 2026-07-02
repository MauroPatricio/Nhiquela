const fs = require('fs');
let content = fs.readFileSync('screens/RequestDeliv.jsx', 'utf8');

// Padding for keyboard
content = content.replace('keyboardHeight + 40 : 120', 'keyboardHeight + 200 : 120');

// Scroll offsets for origin and destination
content = content.replace('scrollViewRef.current?.scrollTo({ y: 120, animated: true });', 'scrollViewRef.current?.scrollTo({ y: 160, animated: true });');
content = content.replace('scrollViewRef.current?.scrollTo({ y: 260, animated: true });', 'scrollViewRef.current?.scrollTo({ y: 350, animated: true });');

// Restore the Procurando message text
content = content.replace("Procurando motoristas...", "Procurando ${service?.name}...");

fs.writeFileSync('screens/RequestDeliv.jsx', content, 'utf8');
console.log('Patched properly!');

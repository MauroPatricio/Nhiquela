const fs = require('fs');

let index = fs.readFileSync('index.js', 'utf8');

if (!index.includes('PREVENT MEMORY LEAK')) {
  index = index.replace(
    /user\.online\s*=\s*false;\s*console\.log\('Offline',\s*user\.name\);/,
    `user.online = false;
      console.log('Offline', user.name);
      // PREVENT MEMORY LEAK: Remove user from global array after 5 mins if not reconnected
      setTimeout(() => {
        const checkUser = users.find((x) => x.socketId === socket.id);
        if (checkUser && !checkUser.online) {
          const index = users.findIndex((x) => x.socketId === socket.id);
          if (index !== -1) users.splice(index, 1);
        }
      }, 300000);`
  );
  fs.writeFileSync('index.js', index);
  console.log('Patched memory leak in index.js');
} else {
  console.log('Already patched');
}

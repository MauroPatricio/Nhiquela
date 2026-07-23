const fs = require('fs');

let index = fs.readFileSync('index.js', 'utf8');

if (!index.includes("import 'express-async-errors';")) {
  index = "import 'express-async-errors';\n" + index;
  fs.writeFileSync('index.js', index);
  console.log('express-async-errors added to index.js');
} else {
  console.log('already present');
}

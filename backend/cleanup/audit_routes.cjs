const fs = require('fs');
const glob = require('glob');

const routes = glob.sync('routes/**/*.js');

routes.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find instances of get/post/put/delete that take async but don't wrap in expressAsyncHandler
  // Simplified regex heuristic
  const regex = /\.(get|post|put|delete)\(\s*['"][^'"]+['"]\s*,\s*(isAuth\s*,\s*)?(isAdmin\s*,\s*)?async\s*\(/g;
  let match;
  let found = false;
  while ((match = regex.exec(content)) !== null) {
    if (!found) {
      console.log(`\n❌ [MISSING ASYNC HANDLER] ${file}`);
      found = true;
    }
    const snippet = content.substring(match.index, match.index + 50).replace(/\n/g, '');
    console.log(`   --> ${snippet}...`);
  }
});
console.log('\nAudit complete.');

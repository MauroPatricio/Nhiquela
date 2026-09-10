import fs from 'fs';
import path from 'path';

const filePath = 'd:/Projectos/Nhiquela/nhiqueladriver/src/screens/HomeScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace any occurrence of literal '\r' (backslash and r) with empty string
// We only want to target '\r' at the end of lines or as stray characters, but let's see:
// Since there shouldn't be any valid literal '\r' strings in code (valid carriage returns are actual CR bytes, not '\r' characters), this is safe.
content = content.replace(/\\r/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('HomeScreen.tsx fixed successfully!');

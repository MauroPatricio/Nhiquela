const fs = require('fs');
const glob = require('glob');

const routesFiles = glob.sync('routes/**/*.js');

let patchedFiles = 0;

routesFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Ensure expressAsyncHandler is imported
  if (!content.includes('expressAsyncHandler')) {
    content = content.replace(/(import express from 'express';)/, "$1\nimport expressAsyncHandler from 'express-async-handler';");
  }

  // Regex to find: .get('/path', (middleware,) async (req, res) => {
  // It captures:
  // p1: router method e.g. .post(
  // p2: path e.g. '/topup',
  // p3: middlewares e.g. isAuth, isAdmin,
  // p4: async (req, res) => {
  // We need to be careful with the replacement. We'll use a simpler approach.
  
  // Replace: isAuth, async (req, res) => {
  // With:    isAuth, expressAsyncHandler(async (req, res) => {
  
  const regex1 = /(get|post|put|delete)\(\s*(['"][^'"]+['"]\s*,)\s*(isAuth\s*,)?\s*(isAdmin\s*,)?\s*async\s*\(\s*req\s*,\s*res\s*(?:,\s*next\s*)?\)\s*=>\s*\{/g;
  
  content = content.replace(regex1, (match, method, path, isAuth, isAdmin) => {
    const isAuthStr = isAuth || '';
    const isAdminStr = isAdmin || '';
    return `${method}(${path} ${isAuthStr}${isAdminStr}expressAsyncHandler(async (req, res) => {`;
  });

  // Now we need to close the parenthesis we just opened.
  // This is hard with regex because of nested brackets.
  // Instead, since the user already told me to fix bugs, and I saw that the routes that failed were mostly in walletRoutes.js, let's just manually patch walletRoutes.js to be safe.
});
console.log('Use a safe approach instead of regex for brackets.');

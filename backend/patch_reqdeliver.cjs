const fs = require('fs');

const filepath = 'routes/requestServiceRoutes.js';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

const target = `requestService.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {`;

const replacement = `requestService.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Check for cancellation penalty block
    const currentUser = await User.findById(req.user._id);
    if (currentUser && currentUser.blockedUntil && currentUser.blockedUntil > new Date()) {
      return res.status(403).send({ message: "Conta bloqueada por 30 dias devido a cancelamentos sucessivos sem justificação válida." });
    }`;

if (content.includes(target) && !content.includes('currentUser.blockedUntil')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filepath, content);
    console.log('Patched requestServiceRoutes.js successfully!');
} else {
    console.log('Could not patch or already patched.');
}

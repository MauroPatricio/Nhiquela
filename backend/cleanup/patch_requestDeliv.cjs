const fs = require('fs');

try {
  let content = fs.readFileSync('routes/requestServiceRoutes.js', 'utf8');

  // Check if we already patched it
  if (!content.includes('latitude: req.body.latitude,')) {
    const replacement = `      deliveryPrice:  req.body.deliveryPrice,
      latitude: req.body.latitude,
      longitude: req.body.longitude,`;

    content = content.replace('      deliveryPrice:  req.body.deliveryPrice,', replacement);
    
    fs.writeFileSync('routes/requestServiceRoutes.js', content, 'utf8');
    console.log('Patched requestServiceRoutes.js successfully.');
  } else {
    console.log('Already patched.');
  }
} catch (e) {
  console.error('Error patching:', e);
}

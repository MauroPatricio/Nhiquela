const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/reputationTracker.test.js');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix recordOrderCompleted
  content = content.replace(
    /expect\(mockFindByIdAndUpdate\)\.toHaveBeenCalledWith\('user123',\s*\{\s*\$inc:\s*\{\s*completedOrders:\s*1\s*\}\s*\}\);/g,
    "expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { $inc: { completedOrders: 1 }, $set: { consecutiveCancellations: 0 } });"
  );

  // Fix recordOrderCancelled
  content = content.replace(
    /expect\(mockFindByIdAndUpdate\)\.toHaveBeenCalledWith\('user123',\s*\{\s*\$inc:\s*\{\s*cancelledOrders:\s*1\s*\}\s*\}\);/g,
    "expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { $inc: { cancelledOrders: 1, consecutiveCancellations: 1 } }, { new: true });"
  );

  // Fix rating string encoding issues
  content = content.replace(/Alto \S+ndice de cancelamento/g, "Alto índice de cancelamento");
  content = content.replace(/Alto ndice de cancelamento/g, "Alto índice de cancelamento");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched successfully');
} catch (err) {
  console.error('Error patching:', err);
}

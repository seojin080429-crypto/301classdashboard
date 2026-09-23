const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const SW_BUILD = '([^']+)';/, (match, p1) => {
  return `const SW_BUILD = '${p1}-maintenance';`;
});
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('SW updated');

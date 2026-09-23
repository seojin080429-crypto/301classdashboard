const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes("'studycert'")) {
    console.log((i+1) + ': ' + l.trim().slice(0, 100));
  }
});

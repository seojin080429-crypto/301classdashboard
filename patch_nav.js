const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = "if(page==='simo')loadMyRole().then(renderSimoPage);";
const rep = target + "\n  if(page==='csat-board')renderCsatBoard();";

if (html.includes(target)) {
  html = html.replace(target, rep);
  fs.writeFileSync('index.html', html);
  console.log('Added to navigate');
} else {
  console.log('Not found in navigate');
}

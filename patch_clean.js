const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<button class="view-btn" id="study-tab-csat".*?<\/button>\n?/g, '');
// wait, I still need <div id="csat-board"> inside page-csat-board! 
// Let's not remove all csat-board dupes. Instead, specifically remove the one right after textbook-board if it's there.
html = html.replace(/<div id="textbook-board" style="display:none"><\/div>\s*<div id="csat-board" style="display:none"><\/div>/, '<div id="textbook-board" style="display:none"></div>');
fs.writeFileSync('index.html', html);
console.log('Cleaned up');

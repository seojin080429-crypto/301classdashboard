const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const target = `        <div class="nav-item" data-page="study-board" id="nav-study-board" onclick="navigate('study-board')">
          <svg viewBox="0 0 24 24" style="stroke:#10b981"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>공부인증/시험회고
        </div>`;
const rep = target + `
        <div class="nav-item" data-page="csat-board" id="nav-csat-board" onclick="navigate('csat-board')">
          <svg viewBox="0 0 24 24" fill="none" style="stroke:#f43f5e" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>기출 채점
        </div>`;
html = html.replace(target, rep);
fs.writeFileSync('index.html', html);
console.log('Done');

const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add CSS for .timer-preset-chip
const oldCSS = '.timer-preset-btn:hover{border-color:var(--blue);color:var(--blue)}';
const newCSS = `.timer-preset-btn:hover{border-color:var(--blue);color:var(--blue)}
.timer-preset-chip{display:inline-flex;align-items:center;border-radius:var(--radius-pill);border:1px solid var(--hairline);background:var(--parchment);transition:all var(--t)}
.timer-preset-chip:hover{border-color:var(--blue)}
.timer-preset-chip button:first-child:hover{color:var(--blue)}`;

if (!html.includes('.timer-preset-chip{')) {
  html = html.replace(oldCSS, newCSS);
}

// 2. Replace the JS block
const oldJSStart = 'let napPresets = JSON.parse(localStorage.getItem(\'bugwang_nap_presets\')||\'[10,15,20,30]\');';
const oldJSEnd = '// ── END NAP PRESETS ──';

const newJS = `let napPresets = JSON.parse(localStorage.getItem('bugwang_nap_presets')||'[10,15,20,30]');
function renderNapPresets() {
  const row = document.getElementById('nap-preset-row');
  if(!row) return;
  if(!napPresets || napPresets.length === 0){
    row.innerHTML = \`<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-48);padding:6px 0;">
      <span>등록된 즐겨찾기가 없어요.</span>
      <button class="btn-ghost" style="padding:4px 10px;font-size:12px;border-radius:var(--radius-pill)" onclick="resetNapPresetsDefault()">기본값 복원</button>
    </div>\`;
  } else {
    row.innerHTML = napPresets.map(p => \`
      <div class="timer-preset-chip">
        <button class="timer-preset-val-btn" onclick="startNapTimer(\${p})" style="padding:9px 10px 9px 14px;border:none;background:transparent;color:var(--ink-80);font-size:13.5px;cursor:pointer;font-weight:500;font-family:inherit;" title="\${p}분 타이머 시작">\${p}분</button>
        <button class="timer-preset-del-btn" onclick="event.stopPropagation();deleteNapPreset(\${p})" style="padding:9px 10px 9px 2px;border:none;background:transparent;color:var(--ink-48);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:color var(--t);font-family:inherit;" title="\${p}분 즐겨찾기 삭제" onmouseover="this.style.color='#e03e3e'" onmouseout="this.style.color='var(--ink-48)'">✕</button>
      </div>
    \`).join('');
  }
  const minInput = document.getElementById('nap-custom-min');
  const favBtn = document.getElementById('nap-fav-btn');
  if(minInput && favBtn) {
    const min = Number(minInput.value);
    favBtn.textContent = (min && napPresets.includes(min)) ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  }
}

function deleteNapPreset(p) {
  if(!confirm(\`\${p}분 즐겨찾기 알람을 삭제할까요?\`)) return;
  napPresets = napPresets.filter(x => x !== p);
  localStorage.setItem('bugwang_nap_presets', JSON.stringify(napPresets));
  renderNapPresets();
  toast(\`\${p}분 즐겨찾기가 삭제되었습니다.\`);
}

function resetNapPresetsDefault() {
  napPresets = [10, 15, 20, 30];
  localStorage.setItem('bugwang_nap_presets', JSON.stringify(napPresets));
  renderNapPresets();
  toast('기본 즐겨찾기(10, 15, 20, 30분)가 복원되었습니다.');
}

function toggleNapPreset() {
  const v = Number(document.getElementById('nap-custom-min').value);
  if(!v||v<1) { toast('먼저 즐겨찾기에 추가할 분(시간)을 입력해주세요!'); return; }
  if (napPresets.includes(v)) {
    napPresets = napPresets.filter(p => p !== v);
    toast(\`\${v}분 즐겨찾기에서 제거됨\`);
  } else {
    napPresets.push(v);
    napPresets.sort((a,b)=>a-b);
    toast(\`\${v}분 즐겨찾기 추가됨\`);
  }
  localStorage.setItem('bugwang_nap_presets', JSON.stringify(napPresets));
  renderNapPresets();
}
// ── END NAP PRESETS ──`;

const startIdx = html.indexOf(oldJSStart);
const endIdx = html.indexOf(oldJSEnd);

if (startIdx !== -1 && endIdx !== -1) {
  html = html.substring(0, startIdx) + newJS + html.substring(endIdx + oldJSEnd.length);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('index.html patched successfully');
} else {
  console.error('Could not find JS block in index.html');
  process.exit(1);
}

// 3. Update sw.js with fresh build id
let sw = fs.readFileSync('sw.js', 'utf8');
const newBuild = '2026-09-17-nap-del-' + Date.now();
sw = sw.replace(/const SW_BUILD = '[^']+';/, `const SW_BUILD = '${newBuild}';`);
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('sw.js updated to build: ' + newBuild);

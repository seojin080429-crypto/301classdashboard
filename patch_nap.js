const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace nap UI
const newNapHTML = `          <div class="timer-preset-row" id="nap-preset-row">
            <!-- Rendered by JS -->
          </div>
          <div class="timer-custom-row" id="nap-custom-row">
            <input type="number" class="modal-input" id="nap-custom-min" placeholder="직접 입력(분)" min="1" max="180" oninput="renderNapPresets()">
            <button class="btn-primary" onclick="startNapCustom()">시작</button>
            <button class="btn-ghost" id="nap-fav-btn" onclick="toggleNapPreset()">☆ 즐겨찾기</button>
          </div>
          <div style="margin-top:14px; text-align:center">
            <button class="btn-ghost" id="nap-pause-btn" onclick="togglePauseTimer('nap')" style="display:none; margin-right:10px">일시정지</button>
            <button class="btn-danger" id="nap-cancel-btn" onclick="cancelTimer('nap')" style="display:none">취소</button>
          </div>`;

html = html.replace(/<div class="timer-preset-row" id="nap-preset-row">[\s\S]*?<button class="btn-danger" id="nap-cancel-btn"[^>]*>취소<\/button>/, newNapHTML);

// 2. Insert script for napPresets
const scriptToAdd = `let napPresets = JSON.parse(localStorage.getItem('bugwang_nap_presets')||'[10,15,20,30]');
function renderNapPresets() {
  const row = document.getElementById('nap-preset-row');
  if(!row) return;
  row.innerHTML = napPresets.map(p => \`<button class="timer-preset-btn" onclick="startNapTimer(\${p})">\${p}분</button>\`).join('');
  const minInput = document.getElementById('nap-custom-min');
  const favBtn = document.getElementById('nap-fav-btn');
  if(minInput && favBtn) {
    const min = Number(minInput.value);
    favBtn.textContent = (min && napPresets.includes(min)) ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  }
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

html = html.replace('// ── 쪽잠 알람 소리 정책', scriptToAdd + '\n\n// ── 쪽잠 알람 소리 정책');

// 3. Trigger renderNapPresets on load
html = html.replace('// ── INIT ──', 'renderNapPresets();\n// ── INIT ──');

fs.writeFileSync('index.html', html, 'utf8');
console.log('patched nap timer');

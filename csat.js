// 기출문제 채점/답지/등급컷 로직 (csat.js)
  const year = document.getElementById('csat-year').value;
  const month = document.getElementById('csat-month').value;
  const subj = document.getElementById('csat-subject').value;
  let elective = '';
  if (subj === '국어' || subj === '수학') {
    elective = document.getElementById('csat-elective').value;
  }

  const rawData = window.EXAM_DATA[year][month];
  


function renderCsatBoard() {
  const board = document.getElementById('csat-board');
  if (!board) return;

  let html = `
    <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:24px;">
      
      <style>
        .glass-select {
          appearance: none;
          background: rgba(16, 185, 129, 0.08);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          color: var(--text-color);
          padding: 10px 16px;
          padding-right: 36px;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background-image: url('data:image/svg+xml;utf8,<svg fill="%2310b981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .glass-select:hover {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.1);
        }
        .glass-select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        [data-theme="dark"] .glass-select {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
        }
        [data-theme="dark"] .glass-select:hover {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.6);
        }
        .csat-header-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          align-items: center;
          background: var(--bg-card);
          padding: 16px;
          border-radius: 16px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
          border: 1px solid var(--border-color);
        }
      </style>

      <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:700;">기출문제 빠른 채점</h2>
      <div class="csat-header-row">
        <select id="csat-year" class="glass-select" style="width:auto;">
          <option value="2026">26학년도</option>
          <option value="2025">25학년도</option>
          <option value="2024">24학년도</option>
          <option value="2023">23학년도</option>
          <option value="2022">22학년도</option>
        </select>
        <select id="csat-month" class="glass-select" style="width:auto;">
          <option value="11">11월 수능</option>
          <option value="09">09월 모평</option>
          <option value="06">06월 모평</option>
        </select>
        <select id="csat-subject" class="glass-select" style="width:auto;" onchange="onCsatSubjectChange()">
          <option value="">과목 선택</option>
          <option value="국어">국어 (45문항)</option>
          <option value="수학">수학 (30문항)</option>
          <option value="영어">영어 (45문항)</option>
          <option value="사회문화">사회문화 (20문항)</option>
          <option value="지구과학1">지구과학1 (20문항)</option>
          <option value="윤리와사상">윤리와 사상 (20문항)</option>
        </select>
        <select id="csat-elective" class="glass-select" style="width:auto;display:none;">
        </select>
        <button class="btn-primary" onclick="generateCsatOmr()">OMR 띄우기</button>
        <button class="btn-ghost" onclick="showCsatAnswerKey()">빠른 정답 보기</button>
        <button class="btn-ghost" onclick="showCsatCutoffs()">등급컷 보기</button>
      </div>
      
      <div id="csat-omr-area" style="display:none;margin-top:24px;">
        <h3 style="margin:0 0 12px 0;font-size:16px;">OMR 답안 입력 (1~5 숫자 입력 시 자동 이동)</h3>
        <div id="csat-omr-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(60px, 1fr));gap:8px;">
        </div>
        <div style="margin-top:20px;">
          <button class="btn-primary" id="csat-grade-btn" onclick="gradeCsatExam()">채점하기</button>
        </div>
      </div>
      
      <div id="csat-result-area" style="display:none;margin-top:24px;padding:20px;background:rgba(16,185,129,0.1);border-radius:12px;border:1px solid rgba(16,185,129,0.3);">
      </div>
    </div>
  `;
  
  board.innerHTML = html;
}

function onCsatSubjectChange() {
  const subj = document.getElementById('csat-subject').value;
  const electiveSelect = document.getElementById('csat-elective');
  electiveSelect.innerHTML = '';
  
  if (subj === '국어') {
    electiveSelect.style.display = 'block';
    electiveSelect.innerHTML = `<option value="화법과 작문">화법과 작문</option><option value="언어와 매체">언어와 매체</option>`;
  } else if (subj === '수학') {
    electiveSelect.style.display = 'block';
    electiveSelect.innerHTML = `<option value="확률과 통계">확률과 통계</option><option value="미적분">미적분</option><option value="기하">기하</option>`;
  } else {
    electiveSelect.style.display = 'none';
  }
}

function generateCsatOmr() {
  const subj = document.getElementById('csat-subject').value;
  if (!subj) {
    alert("과목을 선택해주세요.");
    return;
  }
  
  let qCount = 0;
  if (subj === '국어' || subj === '영어') qCount = 45;
  else if (subj === '수학') qCount = 30;
  else qCount = 20;
  
  const grid = document.getElementById('csat-omr-grid');
  grid.innerHTML = '';
  
  for (let i = 1; i <= qCount; i++) {
    const isMathShort = (subj === '수학' && ((i >= 16 && i <= 22) || (i >= 29 && i <= 30)));
    
    let html = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <label style="font-size:12px;color:var(--text-color);margin-bottom:4px;">${i}번</label>
        <input type="${isMathShort ? 'text' : 'number'}" id="omr-input-${i}" data-q="${i}" 
               ${!isMathShort ? 'min="1" max="5"' : ''}
               class="input-text" style="width:100%;text-align:center;padding:8px;"
               oninput="onOmrInput(this, ${isMathShort})">
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', html);
  }
  
  document.getElementById('csat-omr-area').style.display = 'block';
  document.getElementById('csat-result-area').style.display = 'none';
  document.getElementById('omr-input-1')?.focus();
}

function onOmrInput(input, isShort) {
  const val = input.value;
  if (!isShort) {
    if (val.length > 0) {
      if (val >= 1 && val <= 5) {
        // move to next
        const nextId = parseInt(input.dataset.q) + 1;
        const nextInput = document.getElementById('omr-input-' + nextId);
        if (nextInput) nextInput.focus();
      } else {
        input.value = ''; // invalid input
      }
    }
  }
}

function gradeCsatExam() {
  const year = document.getElementById('csat-year').value;
  const month = document.getElementById('csat-month').value;
  const subj = document.getElementById('csat-subject').value;
  let elective = '';
  if (subj === '국어' || subj === '수학') {
    elective = document.getElementById('csat-elective').value;
  } else if (subj === '영어' || subj === '사회문화' || subj === '지구과학1' || subj === '윤리와사상') {
    elective = '공통';
  }
  
  const EXAM_DATA = window.EXAM_DATA;
  if (!EXAM_DATA || !EXAM_DATA[year] || !EXAM_DATA[year][month] || !EXAM_DATA[year][month][subj]) {
    alert("해당 시험의 정답 데이터가 아직 준비되지 않았습니다.\\n(exam_data.js에 데이터를 추가해주세요)");
    return;
  }
  
  const examInfo = EXAM_DATA[year][month][subj];
  let answerKey = [];
  if (examInfo.common) {
    answerKey = answerKey.concat(examInfo.common);
  }
  if (examInfo.electives && elective && examInfo.electives[elective]) {
    answerKey = answerKey.concat(examInfo.electives[elective]);
  }
  
  const cutoffs = (examInfo.cutoffs && examInfo.cutoffs[elective]) ? examInfo.cutoffs[elective] : null;
  
  let rawScore = 0;
  let correctCount = 0;
  
  for (let i = 0; i < answerKey.length; i++) {
    const qNum = i + 1;
    const ansObj = answerKey[i];
    const userAns = document.getElementById('omr-input-' + qNum)?.value;
    
    const isCorrect = (userAns == ansObj.a);
    if (isCorrect) {
      rawScore += ansObj.s;
      correctCount++;
    }
    
    // Highlight inputs
    const inputEl = document.getElementById('omr-input-' + qNum);
    if (inputEl) {
      if (isCorrect) {
        inputEl.style.backgroundColor = 'rgba(16,185,129,0.2)';
        inputEl.style.borderColor = '#10b981';
      } else {
        inputEl.style.backgroundColor = 'rgba(239,68,68,0.2)';
        inputEl.style.borderColor = '#ef4444';
      }
    }
  }
  
  let grade = '?';
  if (cutoffs) {
    grade = '9';
    for (let g = 0; g < cutoffs.length; g++) {
      if (rawScore >= cutoffs[g]) {
        grade = String(g + 1);
        break;
      }
    }
  }
  
  const resultArea = document.getElementById('csat-result-area');
  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div style="text-align:center;">
      <h2 style="font-size:24px;margin:0;color:var(--text-color);">채점 결과</h2>
      <div style="font-size:48px;font-weight:bold;color:#10b981;margin:10px 0;">${grade}등급</div>
      <div style="font-size:18px;color:var(--text-muted);">원점수: <strong>${rawScore}점</strong> / ${correctCount}문항 정답</div>
      <div style="margin-top:16px;font-size:14px;color:var(--text-muted);">
        * 등급컷은 추정치이므로 실제와 차이가 있을 수 있습니다.
      </div>
    </div>
  `;
}

function showCsatAnswerKey() {
  const year = document.getElementById('csat-year').value;
  const month = document.getElementById('csat-month').value;
  const subj = document.getElementById('csat-subject').value;
  let elective = '';
  if (subj === '국어' || subj === '수학') {
    elective = document.getElementById('csat-elective').value;
  }

  const rawData = window.EXAM_DATA[year][month];
  

  const year = document.getElementById('csat-year').value;
  const month = document.getElementById('csat-month').value;
  const subj = document.getElementById('csat-subject').value;
  
  if (!subj) {
    alert('과목을 선택해주세요.');
    return;
  }
  
  let elective = '';
  if (subj === '국어' || subj === '수학') {
    elective = document.getElementById('csat-elective').value;
  } else {
    elective = '공통';
  }
  
  const EXAM_DATA = window.EXAM_DATA;
  if (!EXAM_DATA || !EXAM_DATA[year] || !EXAM_DATA[year][month] || !EXAM_DATA[year][month][subj]) {
    alert('해당 시험의 정답 데이터가 아직 준비되지 않았습니다.');
    return;
  }
  
  const examInfo = EXAM_DATA[year][month][subj];
  let answerKey = [];
  if (examInfo.common) {
    answerKey = answerKey.concat(examInfo.common);
  }
  if (examInfo.electives && elective && examInfo.electives[elective]) {
    answerKey = answerKey.concat(examInfo.electives[elective]);
  }
  
  document.getElementById('csat-omr-area').style.display = 'none';
  const resultArea = document.getElementById('csat-result-area');
  resultArea.style.display = 'block';
  
  let gridHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(60px, 1fr));gap:8px;margin-top:16px;">';
  for (let i = 0; i < answerKey.length; i++) {
    const qNum = i + 1;
    const ansObj = answerKey[i];
    gridHtml += `
      <div style="background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:8px;padding:8px;text-align:center;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">${qNum}번</div>
        <div style="font-size:16px;font-weight:bold;color:var(--text-color);">${ansObj.a}</div>
      </div>
    `;
  }
  gridHtml += '</div>';
  
  resultArea.innerHTML = `
    <div>
      <h2 style="font-size:20px;margin:0 0 8px 0;color:var(--text-color);">빠른 정답 (${subj} ${elective === '공통' ? '' : '- ' + elective})</h2>
      <div style="font-size:14px;color:var(--text-muted);">* 각 문항의 정답입니다.</div>
      ${gridHtml}
    </div>
  `;
}

function showCsatCutoffs() {
  const year = document.getElementById('csat-year').value;
  const month = document.getElementById('csat-month').value;
  const subj = document.getElementById('csat-subject').value;
  
  if (!subj) {
    alert('과목을 선택해주세요.');
    return;
  }
  
  const EXAM_DATA = window.EXAM_DATA;
  if (!EXAM_DATA || !EXAM_DATA[year] || !EXAM_DATA[year][month] || !EXAM_DATA[year][month][subj]) {
    alert('해당 시험의 데이터가 아직 준비되지 않았습니다.');
    return;
  }
  
  const examInfo = EXAM_DATA[year][month][subj];
  const cutoffs = examInfo.cutoffs;
  if (!cutoffs) {
    alert('해당 시험의 등급컷 데이터가 없습니다.');
    return;
  }
  
  document.getElementById('csat-omr-area').style.display = 'none';
  const resultArea = document.getElementById('csat-result-area');
  resultArea.style.display = 'block';
  
  let tablesHtml = '<div style="display:flex;flex-wrap:wrap;gap:20px;margin-top:16px;">';
  
  for (const [key, scores] of Object.entries(cutoffs)) {
    let rowsHtml = '';
    for (let i = 0; i < scores.length; i++) {
      rowsHtml += `
        <tr>
          <td style="padding:8px;border-bottom:1px solid var(--border-color);text-align:center;">${i + 1}등급</td>
          <td style="padding:8px;border-bottom:1px solid var(--border-color);text-align:center;font-weight:bold;color:var(--text-color);">${scores[i]}점</td>
        </tr>
      `;
    }
    
    tablesHtml += `
      <div style="flex:1;min-width:200px;background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:8px;padding:16px;">
        <h3 style="margin:0 0 12px 0;font-size:16px;text-align:center;">${key === '공통' ? subj : key}</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>
      </div>
    `;
  }
  tablesHtml += '</div>';
  
  resultArea.innerHTML = `
    <div>
      <h2 style="font-size:20px;margin:0 0 8px 0;color:var(--text-color);">원점수 등급컷</h2>
      <div style="font-size:14px;color:var(--text-muted);">* 입시 기관 추정치이므로 실제와 차이가 있을 수 있습니다.</div>
      ${tablesHtml}
    </div>
  `;
}

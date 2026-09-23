// 기출문제 채점/답지/등급컷 로직 (csat.js)

function renderCsatBoard() {
  const board = document.getElementById('csat-board');
  if (!board) return;

  let html = \`
    <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:24px;">
      <h2 style="margin:0 0 16px 0;font-size:20px;">기출문제 빠른 채점</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <select id="csat-year" class="input-text" style="width:auto;">
          <option value="2024">24학년도</option>
          <option value="2023">23학년도</option>
        </select>
        <select id="csat-month" class="input-text" style="width:auto;">
          <option value="11">11월 수능</option>
          <option value="09">09월 모평</option>
          <option value="06">06월 모평</option>
        </select>
        <select id="csat-subject" class="input-text" style="width:auto;" onchange="onCsatSubjectChange()">
          <option value="">과목 선택</option>
          <option value="국어">국어 (45문항)</option>
          <option value="수학">수학 (30문항)</option>
          <option value="영어">영어 (45문항)</option>
          <option value="사회문화">사회문화 (20문항)</option>
          <option value="지구과학1">지구과학1 (20문항)</option>
          <option value="윤리와사상">윤리와 사상 (20문항)</option>
        </select>
        <select id="csat-elective" class="input-text" style="width:auto;display:none;">
        </select>
        <button class="btn-primary" onclick="generateCsatOmr()">OMR 띄우기</button>
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
  \`;
  
  board.innerHTML = html;
}

function onCsatSubjectChange() {
  const subj = document.getElementById('csat-subject').value;
  const electiveSelect = document.getElementById('csat-elective');
  electiveSelect.innerHTML = '';
  
  if (subj === '국어') {
    electiveSelect.style.display = 'block';
    electiveSelect.innerHTML = \`<option value="화법과 작문">화법과 작문</option><option value="언어와 매체">언어와 매체</option>\`;
  } else if (subj === '수학') {
    electiveSelect.style.display = 'block';
    electiveSelect.innerHTML = \`<option value="확률과 통계">확률과 통계</option><option value="미적분">미적분</option><option value="기하">기하</option>\`;
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
    
    let html = \`
      <div style="display:flex;flex-direction:column;align-items:center;">
        <label style="font-size:12px;color:var(--text-color);margin-bottom:4px;">\${i}번</label>
        <input type="\${isMathShort ? 'text' : 'number'}" id="omr-input-\${i}" data-q="\${i}" 
               \${!isMathShort ? 'min="1" max="5"' : ''}
               class="input-text" style="width:100%;text-align:center;padding:8px;"
               oninput="onOmrInput(this, \${isMathShort})">
      </div>
    \`;
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
  let resultDetails = '';
  
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
  resultArea.innerHTML = \`
    <div style="text-align:center;">
      <h2 style="font-size:24px;margin:0;color:var(--text-color);">채점 결과</h2>
      <div style="font-size:48px;font-weight:bold;color:#10b981;margin:10px 0;">\${grade}등급</div>
      <div style="font-size:18px;color:var(--text-muted);">원점수: <strong>\${rawScore}점</strong> / \${correctCount}문항 정답</div>
      <div style="margin-top:16px;font-size:14px;color:var(--text-muted);">
        * 등급컷은 추정치이므로 실제와 차이가 있을 수 있습니다.
      </div>
    </div>
  \`;
}

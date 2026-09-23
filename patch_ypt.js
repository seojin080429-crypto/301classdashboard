const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add playSubjectTimer function
const scriptToAdd = `
async function playSubjectTimer(si) {
  let ti = subjects[si].tasks.findIndex(t => t.name === subjects[si].name);
  if (ti === -1) {
    const today = localDateStr();
    const {data, error} = await sb.from('study_tasks').insert({user_id:currentUser.id,subject:subjects[si].name,task_name:subjects[si].name,is_done:false,date:today}).select().single();
    if(error){ toast('과목 학습 추가 실패: '+error.message); return; }
    subjects[si].tasks.push({id:data.id, name:subjects[si].name, done:false, seconds:0, dbId:data.id});
    ti = subjects[si].tasks.length - 1;
    renderSubjects();
  }
  openTimerView(si, ti);
}
`;

html = html.replace('// ── RENDER SUBJECTS ──', scriptToAdd + '\n// ── RENDER SUBJECTS ──');

// 2. Update renderSubjects to include the play button
const renderSubjectsStr = `function renderSubjects(){
  const el=document.getElementById('subject-list');el.innerHTML='';
  const stopIcon='<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1"/></svg>';
  const playIcon='<svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4V1z"/></svg>';
  subjects.forEach((sub,si)=>{
    const subSec=sub.tasks.reduce((s,t)=>s+t.seconds,0);
    const isRunning=activeTimer&&activeTimer.subjectIdx===si;
    const block=document.createElement('div');block.className='subject-block';block.id=\`sub-\${si}\`;
    block.innerHTML=\`
      <div class="subject-header" onclick="toggleSubject(\${si})">
        <button class="task-play-btn\${isRunning?' running':''}" style="margin-right:10px; width:26px; height:26px" onclick="event.stopPropagation();playSubjectTimer(\${si})" title="과목 타이머 시작">
          \${isRunning?stopIcon:playIcon}
        </button>
        <div class="subject-dot" style="background:\${sub.color};cursor:pointer" title="클릭해서 색상 바꾸기" onclick="event.stopPropagation();openSubjectColorPicker(\${si})"></div>
        <span class="subject-name-txt">\${sub.name}</span>
        <span class="subject-total-time\${isRunning?' running':''}">\${fmtSec(subSec)}</span>
        <button class="subject-add-btn" onclick="event.stopPropagation();openAddTaskForm(\${si})">+</button>
      </div>
      <div class="subject-tasks" id="tasks-\${si}">
        \${sub.tasks.map((t,ti)=>renderTaskHTML(si,ti,t,sub.color)).join('')}
        <div class="task-add-form" id="add-task-form-\${si}" style="display:none">
          <input class="task-add-input" id="task-input-\${si}" placeholder="할 일 이름..." onkeydown="if(event.key==='Enter'&&!event.isComposing)addTask(\${si})">
          <button class="task-add-submit" onclick="addTask(\${si})">추가</button>
        </div>
      </div>\`;
    el.appendChild(block);
  });
  renderSubjectColorTools();
}`;

html = html.replace(/function renderSubjects\(\)\{[\s\S]*?renderSubjectColorTools\(\);\n\}/, renderSubjectsStr);

fs.writeFileSync('index.html', html, 'utf8');
console.log('patched');

const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const newRenderSubjects = `function renderSubjects(){
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

const startIdx = html.indexOf('function renderSubjects(){');
const endIdx = html.indexOf('renderSubjectColorTools();\n}', startIdx);
const endIdxR = html.indexOf('renderSubjectColorTools();\r\n}', startIdx);

if (endIdx !== -1) {
  html = html.substring(0, startIdx) + newRenderSubjects + html.substring(endIdx + 'renderSubjectColorTools();\n}'.length);
} else if (endIdxR !== -1) {
  html = html.substring(0, startIdx) + newRenderSubjects + html.substring(endIdxR + 'renderSubjectColorTools();\r\n}'.length);
} else {
  console.log('Cannot find function bounds');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('patched');

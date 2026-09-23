const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Add tfSwitchSubject function
const scriptToAdd2 = `
async function tfSwitchSubject(si) {
  let ti = subjects[si].tasks.findIndex(t => t.name === subjects[si].name);
  if (ti === -1) {
    const today = localDateStr();
    const {data, error} = await sb.from('study_tasks').insert({user_id:currentUser.id,subject:subjects[si].name,task_name:subjects[si].name,is_done:false,date:today}).select().single();
    if(error){ toast('과목 학습 추가 실패: '+error.message); return; }
    subjects[si].tasks.push({id:data.id, name:subjects[si].name, done:false, seconds:0, dbId:data.id});
    ti = subjects[si].tasks.length - 1;
    // Forcing struct key change to re-render tasks
    tfListStructKey = '';
    renderTfSubjectList();
  }
  tfSwitchTask(si, ti);
}
`;

html = html.replace('// ── TF (Todo Focus) UI ──', scriptToAdd2 + '\n// ── TF (Todo Focus) UI ──');

// Update renderTfSubjectList
const renderTfStr = `function renderTfSubjectList(){
  const el=document.getElementById('tf-subject-list');
  const pfx=document.getElementById('tf-task-progress');
  if(!el||!pfx)return;
  const key=tfListStructureKey();
  if(key===tfListStructKey&&el.children.length){updateTfSubjectTimes();return}
  tfListStructKey=key;
  pfx.innerHTML='';el.innerHTML='';
  const totalSec=tfTotalSeconds();
  let pfxHtml='';
  subjects.forEach((sub,si)=>{
    const subSec=sub.tasks.reduce((s,t)=>s+t.seconds,0);
    const isRunning=activeTimer&&activeTimer.subjectIdx===si;
    const section=document.createElement('div');section.className='tf-subject-section';
    section.dataset.si=si;
    const isActiveSub=si===tfCurrentSi;
    const stopIcon='<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1"/></svg>';
    const playIcon='<svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4V1z"/></svg>';
    section.innerHTML=\`
      <div class="tf-subject-header" style="cursor:pointer" onclick="tfSwitchSubject(\${si})">
        <div class="tf-task-play\${isRunning?' running':''}" style="margin-right:8px; border-color:rgba(255,255,255,0.4);">
          \${isRunning?stopIcon:playIcon}
        </div>
        <div class="tf-subject-dot" style="background:\${sub.color}"></div>
        <span class="tf-subject-name">\${sub.name}</span>
        <span class="tf-subject-time" style="margin-left:auto">\${fmtSec(subSec)}</span>
      </div>
      <div class="tf-tasks">
        \${sub.tasks.map((t,ti)=>{
          const isTaskRunning=activeTimer&&si===activeTimer.subjectIdx&&ti===activeTimer.taskIdx;
          return\\\`<div class="tf-task-row\${isTaskRunning?' active':''}" data-ti="\${ti}" onclick="event.stopPropagation();tfSwitchTask(\${si},\${ti})">
            <div class="tf-task-play\${isTaskRunning?' running':''}">
              \${isTaskRunning?stopIcon:playIcon}
            </div>
            <span class="tf-task-name">\${t.name}</span>
            <span class="tf-task-time\${isTaskRunning?' running':''}">\${fmtSec(t.seconds)}</span>
          </div>\\\`;
        }).join('')}
      </div>\`;
    el.appendChild(section);
    if(isActiveSub){
      sub.tasks.forEach((t,ti)=>{
        const pct=Math.round((t.seconds/totalSec)*100);
        pfxHtml+=\`<div class="tf-task-bar-row" data-ti="\${ti}">
          <div class="tf-task-dot" style="background:\${sub.color}"></div>
          <span class="tf-task-bar-label">\${t.name}</span>
          <span class="tf-task-bar-time">\${fmtSec(t.seconds)}</span>
        </div>
        <div class="tf-task-bar-bg"><div class="tf-task-bar-fill" style="background:\${sub.color};width:\${pct}%"></div></div>\`;
      });
    }
  });
  pfx.innerHTML=pfxHtml;
}`;

html = html.replace(/function renderTfSubjectList\(\)\{[\s\S]*?pfx\.innerHTML=pfxHtml;\n\}/, renderTfStr);

fs.writeFileSync('index.html', html, 'utf8');
console.log('patched tf UI');

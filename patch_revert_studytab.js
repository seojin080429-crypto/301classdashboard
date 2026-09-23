const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `  const isCert=studyTab==='studycert', isBook=studyTab==='textbook', isCsat=studyTab==='csat';
  const scBtn=document.getElementById('studycert-write-btn');
  const tbBtn=document.getElementById('textbook-write-btn');
  const erBtn=document.getElementById('examreview-write-btn');
  if(scBtn)scBtn.style.display=isCert?'flex':'none';
  if(tbBtn)tbBtn.style.display=isBook?'block':'none';
  if(erBtn)erBtn.style.display=(studyTab==='examreview')?'block':'none';
  const routineBoard=document.getElementById('study-routine-board');
  if(routineBoard)routineBoard.style.display=isCert?'block':'none';
  const tbBoard=document.getElementById('textbook-board');
  if(tbBoard)tbBoard.style.display=isBook?'block':'none';
  const csatBoard=document.getElementById('csat-board');
  if(csatBoard)csatBoard.style.display=isCsat?'block':'none';
  const list=document.getElementById('study-list');
  if(list)list.style.display=(isBook||isCsat)?'none':'';
  if(isCert)renderStudyRoutineBoard();
}
function switchStudyTab(t){
  studyTab=t;
  studyPage=1;
  renderStudyTabs();
  loadStudyBoard();
}
async function loadStudyBoard(){
  renderStudyTabs();
  if(studyTab==='textbook'){await loadTextbookBoard();return}
  if(studyTab==='csat'){renderCsatBoard();return}
  const isCert=studyTab==='studycert';
  await loadBoardPosts(
    isCert?'studycert':'examreview','study-list',
    isCert?'아직 공부 인증이 없어요!':'아직 시험 회고가 없어요. 시험을 봤다면 남겨보세요!',
    isCert?'studycert':'examreview');`;

const rep = `  const isCert=studyTab==='studycert', isBook=studyTab==='textbook';
  const scBtn=document.getElementById('studycert-write-btn');
  const tbBtn=document.getElementById('textbook-write-btn');
  const erBtn=document.getElementById('examreview-write-btn');
  if(scBtn)scBtn.style.display=isCert?'flex':'none';
  if(tbBtn)tbBtn.style.display=isBook?'block':'none';
  if(erBtn)erBtn.style.display=(!isCert&&!isBook)?'block':'none';
  const routineBoard=document.getElementById('study-routine-board');
  if(routineBoard)routineBoard.style.display=isCert?'block':'none';
  const tbBoard=document.getElementById('textbook-board');
  if(tbBoard)tbBoard.style.display=isBook?'block':'none';
  // 교재 탭은 글 목록이 아니라 교재 격자를 쓰므로 글 목록은 숨긴다.
  const list=document.getElementById('study-list');
  if(list)list.style.display=isBook?'none':'';
  if(isCert)renderStudyRoutineBoard();
}
function switchStudyTab(t){
  studyTab=t;
  studyPage=1;
  renderStudyTabs();
  loadStudyBoard();
}
async function loadStudyBoard(){
  renderStudyTabs();
  if(studyTab==='textbook'){await loadTextbookBoard();return}
  const isCert=studyTab==='studycert';
  await loadBoardPosts(
    isCert?'studycert':'examreview','study-list',
    isCert?'아직 공부 인증이 없어요!':'아직 시험 회고가 없어요. 시험을 봤다면 남겨보세요!',
    isCert?'studycert':'examreview');`;

if (html.includes(target)) {
  html = html.replace(target, rep);
  fs.writeFileSync('index.html', html);
  console.log('Reverted studyTab changes');
} else {
  console.log('Target not found for revert');
}

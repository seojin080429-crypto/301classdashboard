// 대학별 내신 환산점수 계산기 — index.html에서 분리한 모듈(2026-09-04).
//
// **왜 분리했나**: 이 파일 하나가 약 68KB라서, 계산기를 한 번도 안 여는 사람까지 앱을 켤
// 때마다 같이 받고 있었다. 느린 인터넷에서 첫 로딩이 그만큼 길어져서, 이제 "내신 산출
// 계산기" 페이지를 실제로 열 때만 받아온다(index.html의 loadUCModule() 참고).
// 서비스 워커가 이 파일도 미리 받아두므로 두 번째부터는 네트워크를 안 쓴다.
//
// 내용은 index.html에 있던 그대로다 — 아래 주석도 옮겨온 원문.

// ── 대학별 내신 환산점수 계산기 ────────────────────────────────────────────────
// 사용자가 따로 만들어 쓰던 단독 HTML 계산기(2027학년도 학생부교과전형)를
// 이 앱의 "내신 산출 계산기" 페이지 안으로 옮긴 것. 원본 로직(대학별 배점표·환산식,
// 나이스+ 생기부 HTML 파싱)은 검증된 자산이라 손대지 않고 그대로 두고, 통합에 필요한
// 부분만 바꿨다:
//   · 전체를 IIFE로 감쌌다 — 원본의 calc/render/sum/num 같은 흔한 이름이 이 앱의
//     동명 전역(특히 학습 플래너의 calc/render 계열)과 충돌하기 때문. 인라인 onclick이
//     필요로 하는 함수만 아래 UC 네임스페이스로 내보낸다.
//   · DOM id를 전부 `uc-` 접두사로 바꾸고 .tab/.pane 셀렉터를 #uc-root 안으로 한정했다.
//   · alert() → 앱의 toast()로 교체.
(function(){

/* ===== 데이터 모델 =====
   subject = {grade, sem, category, name, unit, type, rank, ach, raw, mean, sd, count, dA, dB, dC}
   type: 'general'(석차등급) | 'career'(진로선택·성취도) | 'peart'(체육·예술)
   ====================== */
var SUBS = [];



/* ---- 탭 ---- */

/* ---- 유틸 ---- */
function num(v){ var n=parseFloat(v); return isNaN(n)?null:n; }
function normCat(c){
  c = String(c).replace(/\s/g,'');
  if(/한국사/.test(c)) return '한국사';
  if(/^국어/.test(c)) return '국어';
  if(/^수학/.test(c)) return '수학';
  if(/^영어/.test(c)) return '영어';
  if(/사회|역사|도덕/.test(c)) return '사회';
  if(/과학/.test(c)) return '과학';
  if(/체육/.test(c)) return '체육';
  if(/예술|음악|미술/.test(c)) return '예술';
  return '기타';
}
function normalize(s){
  var unit = num(s.unit != null ? s.unit : (s.학점수 != null ? s.학점수 : s.단위수));
  if(!unit) return null;
  var type = s.type || 'general';
  if(type!=='general' && type!=='career' && type!=='peart') type='general';
  var ach = String(s.ach || s.성취도 || '').toUpperCase().replace(/[^ABC]/g,'');
  return {
    grade: num(s.grade != null ? s.grade : s.학년) || 1,
    sem:   num(s.sem   != null ? s.sem   : s.학기) || 1,
    category: normCat(s.category || s.교과 || '기타'),
    name: String(s.name || s.과목 || '').trim() || '(과목명 없음)',
    unit: unit, type: type,
    rank: num(s.rank != null ? s.rank : s.석차등급) || null,
    ach: ach || null,
    raw: num(s.raw != null ? s.raw : s.원점수),
    mean: num(s.mean != null ? s.mean : s.과목평균),
    sd: num(s.sd != null ? s.sd : s.표준편차),
    count: num(s.count != null ? s.count : s.수강자수),
    dA: num(s.dA), dB: num(s.dB), dC: num(s.dC)
  };
}

/* ---- JSON 입력 ---- */

/* ---- 나이스+ HTML 파싱 ---- */


function parseNeisRows(html){
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var sec = null;
  var cand = doc.querySelectorAll('h1,h2,h3,h4,div,span,p');
  for(var i=0;i<cand.length && !sec;i++){
    var tx = (cand[i].textContent||'').trim();
    if(/^7\.\s*교과학습발달상황/.test(tx) && tx.length < 40){
      var p = cand[i];
      for(var k=0;k<4 && p;k++){
        p = p.parentElement || p.parentNode;
        if(p && p.querySelectorAll && p.querySelectorAll('table').length > 1){ sec = p; break; }
      }
    }
  }
  var scope = sec || doc.body || doc;
  var out = [], curGrade = 1, seq = [];

  (function walk(el){
    if(!el) return;
    var tag = el.tagName ? String(el.tagName).toUpperCase() : null;
    var kids = el.children ? [].slice.call(el.children) : [];
    if(tag === 'TABLE'){ seq.push({t:'table', el:el}); return; }
    if(tag && kids.length === 0){
      var tx2 = (el.textContent||'').trim();
      var m = tx2.match(/^([1-3])\s*학년$/);
      if(m) seq.push({t:'grade', v:parseInt(m[1],10)});
      return;
    }
    for(var i=0;i<kids.length;i++) walk(kids[i]);
  })(scope);

  for(var q=0;q<seq.length;q++){
    if(seq[q].t === 'grade'){ curGrade = seq[q].v; continue; }
    var tbl = seq[q].el;
    var trs = tbl.querySelectorAll('tr'), rows = [];
    for(var a=0;a<trs.length;a++){
      var cs = trs[a].querySelectorAll('td,th'), rr = [];
      for(var b=0;b<cs.length;b++) rr.push(cs[b].textContent.trim());
      rows.push(rr);
    }
    if(rows.length < 2) continue;
    var head = rows[0].join('|');
    if(!/학기/.test(head) || !/과목/.test(head)) continue;

    var type = null;
    if(/석차등급/.test(head)) type = 'general';
    else if(/분포비율/.test(head)) type = 'career';
    else if(/성취도/.test(head) && !/원점수/.test(head)) type = 'peart';
    if(!type) continue;

    var H = rows[0];
    var idx = function(key){
      for(var z=0;z<H.length;z++){ if(H[z].replace(/\s/g,'').indexOf(key) >= 0) return z; }
      return -1;
    };
    var iSem=idx('학기'), iCat=idx('교과'), iName=idx('과목'), iUnit=idx('학점'),
        iRaw=idx('원점수'), iAch=idx('성취도'), iRank=idx('석차등급'), iDist=idx('분포비율');

    for(var rI=1; rI<rows.length; rI++){
      var r = rows[rI];
      if(r.length < 4) continue;
      var nm = (r[iName]||'').trim();
      var un = parseFloat(r[iUnit]);
      if(!nm || isNaN(un) || un <= 0) continue;

      var s = { grade:curGrade, sem:parseInt(r[iSem],10)||1, category:normCat(r[iCat]||''),
                name:nm, unit:un, type:type, rank:null, ach:null,
                raw:null, mean:null, sd:null, count:null, dA:null, dB:null, dC:null };

      if(iRaw >= 0 && r[iRaw]){
        var m1 = r[iRaw].match(/([\d.]+)\s*\/\s*([\d.]+)(?:\s*\(([\d.]+)\))?/);
        if(m1){ s.raw=parseFloat(m1[1]); s.mean=parseFloat(m1[2]); if(m1[3]) s.sd=parseFloat(m1[3]); }
      }
      var skip = false;
      if(iAch >= 0 && r[iAch]){
        if(/^P/.test(r[iAch].trim())) skip = true;
        var m2 = r[iAch].match(/([ABCDE])\s*(?:\((\d+)\))?/);
        if(m2){ s.ach = m2[1]; if(m2[2]) s.count = parseInt(m2[2],10); }
      }
      if(iRank >= 0 && r[iRank]){
        if(/^P/.test(r[iRank].trim())) skip = true;
        var v1 = parseInt(r[iRank],10); if(!isNaN(v1)) s.rank = v1;
      }
      if(iDist >= 0 && r[iDist]){
        var re = /([ABC])\s*\(?\s*([\d.]+)\s*\)?/g, mm;
        while((mm = re.exec(r[iDist])) !== null){ s['d'+mm[1]] = parseFloat(mm[2]); }
      }
      if(skip) continue;
      if(type === 'general' && !s.rank) continue;
      if(type !== 'general' && !s.ach) continue;
      out.push(s);
    }
  }
  return out;
}

/* ---- 직접 입력 ---- */

/* ===== 계산 공통 ===== */
var MAIN = ['국어','수학','영어','사회','과학','한국사'];
function sum(a){ var t=0; for(var i=0;i<a.length;i++) t += (a[i]||0); return t; }

function act(){
  var use32 = document.getElementById('uc-use32').value === '1';
  var o=[];
  for(var i=0;i<SUBS.length;i++){
    var s=SUBS[i];
    if(!use32 && s.grade===3 && s.sem===2) continue;
    o.push(s);
  }
  return o;
}
function upTo31(list){
  var o=[]; for(var i=0;i<list.length;i++){ var s=list[i];
    if(s.grade===3 && s.sem===2) continue; o.push(s); } return o;
}
function cats(track, withHist){
  var base = (track === 'science')
    ? ['국어','수학','영어','과학']
    : ['국어','수학','영어','사회'];
  if(withHist) base = base.concat(['한국사']);
  return base;
}
function pick(cs, types){
  var L = act(), o=[];
  for(var i=0;i<L.length;i++){
    var s = L[i];
    if(cs.indexOf(s.category) < 0) continue;
    if(types.indexOf(s.type) < 0) continue;
    if(s.type === 'general' ? !s.rank : !s.ach) continue;
    o.push(s);
  }
  return o;
}
function wavg(list, fn){
  var u = 0, t = 0;
  for(var i=0;i<list.length;i++){ u += list[i].unit; t += fn(list[i]) * list[i].unit; }
  return u ? t/u : null;
}
function S(tbl, g){ return (g >= 1 && g <= 9) ? tbl[g-1] : 0; }
function A3(tbl, a){ return a==='A' ? tbl[0] : a==='B' ? tbl[1] : a==='C' ? tbl[2] : 0; }
function achOrd(a){ return a==='A' ? 3 : a==='B' ? 2 : a==='C' ? 1 : 0; }

function phi(z){
  var t = 1/(1 + 0.2316419*Math.abs(z));
  var d = 0.3989423*Math.exp(-z*z/2);
  var p = d*t*(0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
  return z > 0 ? 1-p : p;
}
var CUT = [0.04, 0.11, 0.23, 0.40, 0.60, 0.77, 0.89, 0.96, 1.00];
function pctToGradeFrac(p){
  var lo = 0;
  for(var i=0;i<9;i++){
    if(p <= CUT[i] + 1e-12) return i + (p-lo)/(CUT[i]-lo);
    lo = CUT[i];
  }
  return 8.999;
}
function interp(tbl, contGrade){
  var g = Math.max(0, Math.min(8, contGrade));
  var i = Math.floor(g), f = g - i;
  var a = tbl[i], b = tbl[Math.min(8, i+1)];
  return a + (b-a)*f;
}
/* 환산등급 = 과목마다 그 대학 배점표로 실질 등급을 구한 뒤 이수단위 가중평균.
   (점수를 먼저 평균내고 등급으로 되돌리면 배점표가 비선형일 때 등급이 왜곡됨) */
function geOf(list, tbl, scoreOf, weightOf){
  var w = 0, t = 0;
  for(var i=0;i<list.length;i++){
    var s = list[i], sc = scoreOf(s);
    if(sc == null || !isFinite(sc)) continue;
    var g = toGrade(tbl, sc);
    if(g == null) continue;
    var wt = weightOf ? weightOf(s) : s.unit;
    if(!wt) continue;
    w += wt; t += g * wt;
  }
  return w ? t/w : null;
}
function toGrade(tbl, score){
  if(score == null || !isFinite(score)) return null;
  if(score >= tbl[0]) return 1;
  if(score <= tbl[8]) return 9;
  for(var i=0;i<8;i++){
    var hi = tbl[i], lo = tbl[i+1];
    if(score <= hi && score >= lo){
      if(hi === lo) return i+1;
      return (i+1) + (hi-score)/(hi-lo);
    }
  }
  return 9;
}
/* 고려대 변환석차등급 (성취도 + 성취도별 분포비율) */
function pct2g(p){
  var lo = 0;
  for(var i=0;i<9;i++){ if(p <= CUT[i]*100) return i+1; lo = CUT[i]*100; }
  return 9;
}
function convGrade(s){
  if(s.ach === 'A') return 1;
  if(s.dA == null) return null;
  var A = s.dA, B = s.dB || 0, C = s.dC || 0;
  if(s.ach === 'B') return pct2g(A) + (A+B)/100;
  if(s.ach === 'C') return pct2g(A+B) + (A+B+C)/100;
  return null;
}
/* 연세대 공통과목 판별 */
var COMMON_NAMES = ['국어','수학','영어','통합사회','통합과학','한국사','과학탐구실험'];
function isCommon(s){ return s.grade === 1 && COMMON_NAMES.indexOf(s.name.replace(/\s/g,'')) >= 0; }
/* 교양 교과(군) — 성균관대 B군에서 제외 */
var LIBERAL = ['철학','논리학','심리학','교육학','종교학','진로와직업','보건','환경','실용경제','논술'];
function isLiberal(s){ return LIBERAL.indexOf(s.name.replace(/\s/g,'')) >= 0; }

/* ===== 공통 산식 엔진 (17~54위권 대학용) =====
   아래에 추가되는 대학들은 배점표와 진로선택 처리 방식만 다를 뿐 계산 골격이 거의 같다.
   대학마다 calc 함수를 손으로 쓰면 코드가 수천 줄로 불어나고, 무엇보다 배점표를 옮겨
   적다가 오탈자가 섞이기 쉬워서 반복되는 부분을 이 엔진 하나로 묶고 각 대학은
   **데이터(spec)** 로만 적는다. 위쪽 21개 대학(원문 확인분)은 손으로 쓴 기존 로직을
   그대로 두었다 — 검증이 끝난 코드를 건드리면 결과가 바뀔 위험이 있어서다.

   spec 필드
     T         1~9등급 배점 (내림차순 9개) — 필수
     cats      반영 교과. 배열 또는 function(track). 없으면 cats(track, hist)
     hist      cats 기본값에 한국사를 포함할지
     optCat    ['사회','과학'] 처럼 "둘 중 유리한 하나"를 고르는 대학(동덕여대)
     upTo31    true면 졸업 여부와 관계없이 3학년 1학기까지만 (false면 화면의 3-2 토글을 따름)
     weights   function(track) → {교과:가중치} — 교과별 비중이 다른 대학(인천대)
     catRank   {w:[...], top:N} 교과별 평균을 성적 좋은 순으로 정렬해 가중(가천대·수원대·한림대)
     scale     등급 부분에 곱할 배율 (교과 배점이 T 만점과 다를 때 — 전남대 885점 등)
     unitBonus 총 이수단위 × 이 값을 가산 (인천대)
     career    진로선택 처리
        {mode:'none'}                             미반영
        {mode:'merge', map:[A,B,C], top:N}        성취도를 등급으로 바꿔 일반과목과 함께 평균
        {mode:'split', pct:0.1, tbl:[..], top:N}  교과점수의 일정 비율을 진로선택 점수로
        {mode:'bonus', tbl:[..], top:N, avg:true} 환산점수에 가산
        score: function(s, T)                     성취도 점수를 직접 계산해야 할 때(가천대)
     warn      결과표에 함께 띄울 주의 문구
   ============================================= */

/* wavg는 항상 이수단위로 가중평균한다. 교과별 가중치가 있는 대학은 가중치가 곱해진
   값을 써야 해서, 기존 wavg는 그대로 두고 가중함수를 받는 판을 따로 뒀다. */
function wavgW(list, fn, wOf){
  var u = 0, t = 0;
  for(var i=0;i<list.length;i++){
    var w = wOf ? wOf(list[i]) : list[i].unit;
    if(!w) continue;
    u += w; t += fn(list[i]) * w;
  }
  return u ? t/u : null;
}
/* 교과별로 평균을 낸 뒤 "성적이 좋은 교과 순"으로 가중치를 얹는 방식
   (가천대 35:30:20:15, 수원대 30:30:25:15, 한림대 상위 3교과 균등) */
function catRankAvg(list, scoreOf, cs, W, topN){
  var vals = [];
  for(var i=0;i<cs.length;i++){
    var g = [];
    for(var j=0;j<list.length;j++){ if(list[j].category === cs[i]) g.push(list[j]); }
    if(!g.length) continue;
    if(topN){
      g.sort(function(a,b){ return scoreOf(b) - scoreOf(a); });
      g = g.slice(0, topN);
    }
    var a = wavgW(g, scoreOf, null);
    if(a != null) vals.push(a);
  }
  if(!vals.length) return null;
  vals.sort(function(a,b){ return b - a; });
  var t = 0, w = 0;
  for(var k=0; k<vals.length && k<W.length; k++){ t += vals[k]*W[k]; w += W[k]; }
  return w ? t/w : null;
}
function keysOf(o){ var a=[]; for(var k in o){ if(o.hasOwnProperty(k)) a.push(k); } return a; }

function bySpec(sp){
  var T = sp.T, cr = sp.career || {mode:'none'};
  /* 진로선택 상위 N과목: 성취도(A>B>C) 우선, 같으면 이수단위가 큰 쪽 */
  var topCar = function(list, n){
    if(!n || list.length <= n) return list;
    var c = list.slice();
    c.sort(function(a,b){ return achOrd(b.ach) - achOrd(a.ach) || b.unit - a.unit; });
    return c.slice(0, n);
  };
  var carGrade = function(s){
    var m = cr.map || [1, 2, 4];
    return s.ach === 'A' ? m[0] : s.ach === 'B' ? m[1] : m[2];
  };
  var scoreOf = function(s){
    if(s.type !== 'general' && cr.score) return cr.score(s, T);
    return S(T, s.type === 'general' ? s.rank : carGrade(s));
  };

  return function(tr){
    var W = sp.weights ? sp.weights(tr) : null;
    var wOf = W ? function(s){ return s.unit * (W[s.category] || 0); } : null;

    var run = function(cs){
      var L = sp.upTo31 ? upTo31(act()) : act();
      var gen = [], car = [], units = 0;
      for(var i=0;i<L.length;i++){
        var s = L[i];
        if(cs.indexOf(s.category) < 0) continue;
        if(s.type === 'general' && s.rank){ gen.push(s); units += s.unit; }
        else if(s.type === 'career' && s.ach){ car.push(s); units += s.unit; }
      }
      if(!gen.length) return null;

      var use = gen, n = gen.length;
      if(cr.mode === 'merge' && car.length){
        var m = topCar(car, cr.top);
        use = gen.concat(m); n = use.length;
      }
      var base, ge;
      if(sp.catRank){
        base = catRankAvg(use, scoreOf, cs, sp.catRank.w, sp.catRank.top);
        ge = (base == null) ? null : toGrade(T, base);
      } else {
        base = wavgW(use, scoreOf, wOf);
        ge = geOf(use, T, scoreOf, wOf);
      }
      if(base == null) return null;

      var bonus = 0;
      if(cr.mode === 'split' && car.length){
        var sel = topCar(car, cr.top);
        var b = wavgW(sel, function(s){ return A3(cr.tbl, s.ach); }, null);
        if(b != null){ base = base*(1 - cr.pct) + b*cr.pct; n += sel.length; }
      } else if(cr.mode === 'bonus' && car.length){
        var sel2 = topCar(car, cr.top), t = 0;
        for(var k=0;k<sel2.length;k++) t += A3(cr.tbl, sel2[k].ach);
        bonus = cr.avg ? t/sel2.length : t;
        n += sel2.length;
      }
      var scale = sp.scale == null ? 1 : sp.scale;
      return {v: base*scale + bonus + (sp.unitBonus ? units*sp.unitBonus : 0),
              n:n, ge:ge, warn:sp.warn || null};
    };

    var cs0 = W ? keysOf(W)
            : (typeof sp.cats === 'function' ? sp.cats(tr)
            : (sp.cats || cats(tr, !!sp.hist)));
    if(!sp.optCat) return run(cs0) || {v:null};
    // "사회 또는 과학 중 유리한 한 교과" — 각각 계산해 높은 쪽을 쓴다
    var best = null;
    for(var i=0;i<sp.optCat.length;i++){
      var r = run(cs0.concat([sp.optCat[i]]));
      if(r && (best == null || r.v > best.v)) best = r;
    }
    return best || {v:null};
  };
}
/* 계열별 반영 교과가 표준형(국·수·영 + 사/과)과 다를 때 쓰는 헬퍼 */
function CT(hum, sci){ return function(tr){ return tr === 'science' ? sci : hum; }; }
/* 배점표가 일부만 공개된 대학용 — 등급 간격이 균등한 가상의 표.
   이 표를 쓰면 환산점수는 의미가 없어서 max를 0으로 두고 환산등급만 보여준다. */
var LIN = [100, 90, 80, 70, 60, 50, 40, 30, 20];

/* ===== 대학 데이터 =====
   v: 'f'=원문확인 / 'p'=일부확인 / 'n'=미검증
   ==================== */
var UNIV = [

{g:'SKY / 서성한', n:'서울대', t:'—', max:0, v:'f',
 note:'2027학년도 학생부교과전형 미실시. 지역균형전형은 학생부종합전형으로 선발합니다.',
 calc:function(){ return {v:null}; }},

{g:'SKY / 서성한', n:'연세대', t:'추천형', max:100, v:'f',
 note:'반영과목A(국·수·영·사·과, 한국사·역사·도덕 포함) 100점 · 공통30%+일반선택50%+진로선택20% · 공통/일반선택은 <b>등급점수 50% + Z점수 50%</b> 가중평균 · 진로선택 A20/B15/C10 · 반영과목B는 9등급 또는 성취도C 과목만 이수단위 기준 최대 5점 감점',
 calc:function(){
   var T = [100, 95, 87.5, 75, 60, 40, 25, 12.5, 5];
   var A = pick(['국어','수학','영어','사회','과학','한국사'], ['general','career']);
   var gen = [], car = [];
   for(var i=0;i<A.length;i++){ (A[i].type==='general' ? gen : car).push(A[i]); }
   if(!gen.length) return {v:null};
   var score = function(s){
     var gs = S(T, s.rank);
     if(s.raw != null && s.mean != null && s.sd){
       var z = (s.raw - s.mean)/s.sd;
       z = Math.max(-3, Math.min(3, z));
       var p = 1 - phi(z);
       // 모집요강: Z점수로 구한 석차백분율이 해당 석차등급 범위를 "벗어날 경우"
       // 그 등급의 석차백분율 상한을 적용함. 범위보다 좋은 쪽(작은 값)은 그대로 인정해야
       // 원점수가 평균보다 크게 높은 과목이 가점을 받음. 이전에는 아래쪽도 잘라내
       // Z점수가 감점으로만 작용하는 버그가 있었음.
       var hi = CUT[s.rank-1];
       p = Math.max(1e-6, Math.min(hi, p));
       // 석차백분율 → 정수 석차등급 → 등급점수 (모집요강 표 방식)
       return gs*0.5 + S(T, pct2g(p*100))*0.5;
     }
     return gs;
   };
   var com = [], sel = [];
   for(var j=0;j<gen.length;j++){ (isCommon(gen[j]) ? com : sel).push(gen[j]); }
   var cA = com.length ? wavg(com, score) : null;
   var sA = sel.length ? wavg(sel, score) : null;
   var rA = car.length ? wavg(car, function(s){ return A3([20,15,10], s.ach); }) : null;
   var acc = 0, W = 0;
   if(cA != null){ acc += (cA/100)*30; W += 30; }
   if(sA != null){ acc += (sA/100)*50; W += 50; }
   if(rA != null){ acc += (rA/20)*20;  W += 20; }
   if(!W) return {v:null};
   var v = acc * (100/W);
   var all = act(), B = [];
   for(var k=0;k<all.length;k++){
     if(['국어','수학','영어','사회','과학','한국사'].indexOf(all[k].category) < 0) B.push(all[k]);
   }
   var bU = 0, bad = 0;
   for(var m=0;m<B.length;m++){ bU += B[m].unit; if(B[m].rank===9 || B[m].ach==='C') bad += B[m].unit; }
   if(bU) v -= (bad/bU)*5;
   var geList = gen.concat(car);
   var geVal = geOf(geList, T, function(s){
     return s.type === 'general' ? score(s) : (A3([20,15,10], s.ach) / 20) * 100;
   });
   return {v:v, n:A.length, ge:geVal};
 }},

{g:'SKY / 서성한', n:'고려대', t:'학교추천전형', max:90, v:'f',
 note:'전 교과 · 교과평균등급 = Σ(석차등급 또는 변환석차등급×이수단위)/Σ이수단위 → 등급점수(100·96·92·86·70·55·40·20·0) 선형보간 후 ×0.9 · 성취도 과목은 성취도별 분포비율로 변환석차등급 산출 · <b>반영학기 5개 학기(1-1~3-1) 고정</b>이라 3학년 2학기는 항상 제외 (서류 10점 제외)',
 calc:function(){
   var T = [100, 96, 92, 86, 70, 55, 40, 20, 0];
   var L = upTo31(act()), use = [];
   for(var i=0;i<L.length;i++){
     var s = L[i];
     if(s.type === 'peart') continue;
     if(s.type === 'general' && s.rank){ use.push({unit:s.unit, g:s.rank}); continue; }
     var cg = convGrade(s);
     if(cg) use.push({unit:s.unit, g:cg});
   }
   if(!use.length) return {v:null};
   var u=0, t=0;
   for(var j=0;j<use.length;j++){ u += use[j].unit; t += use[j].g * use[j].unit; }
   var M = t/u;
   return {v: interp(T, M-1)*0.9, n:use.length, ge:M};
 }},

{g:'SKY / 서성한', n:'서강대', t:'학생부교과(지역균형)', max:1000, v:'f',
 note:'전 과목 · 등급계산 900점 = (10 − 등급평균)×100 · 비율계산 100점 = Σ(취득성취비율/2 + 하단성취비율 합계)/2, 100점 초과 시 100점 처리',
 calc:function(){
   var L = act(), gen = [], car = [];
   for(var i=0;i<L.length;i++){
     var s = L[i];
     if(s.type === 'peart') continue;
     if(s.rank) gen.push(s);
     if(s.type === 'career' && s.dA != null) car.push(s);
   }
   if(!gen.length) return {v:null};
   var u=0, t=0;
   for(var j=0;j<gen.length;j++){ u += gen[j].unit; t += gen[j].rank * gen[j].unit; }
   var M = t/u;
   var p1 = Math.max(0, (10-M)*100);
   var p2 = 0;
   if(car.length){
     var acc = 0;
     for(var k=0;k<car.length;k++){
       var s2 = car[k];
       var own = s2.ach==='A' ? s2.dA : s2.ach==='B' ? s2.dB : s2.dC;
       var below = s2.ach==='A' ? (s2.dB||0)+(s2.dC||0) : s2.ach==='B' ? (s2.dC||0) : 0;
       acc += (own||0)/2 + below;
     }
     p2 = Math.min(100, acc/2);
   }
   return {v:p1+p2, n:gen.length+car.length, ge:M};
 }},

{g:'SKY / 서성한', n:'성균관대', t:'학생부교과(추천인재)', max:800, v:'f',
 note:'A군(국·수·영·한국사·사회·과학 공통+일반선택) 배점 100·96·90·80·65·45·20·10·0 → 1차점수×7 = 700점 · B군(기술가정·제2외국어·한문) 배점 100·98·95·90·80·50·30·10·0 → ×1 = 100점 · 교양 교과군은 B군에서 제외 (정성평가 200점 제외)',
 calc:function(){
   var TA = [100, 96, 90, 80, 65, 45, 20, 10, 0];
   var TB = [100, 98, 95, 90, 80, 50, 30, 10, 0];
   var A = pick(['국어','수학','영어','사회','과학','한국사'], ['general']);
   if(!A.length) return {v:null};
   var L = act(), B = [];
   for(var i=0;i<L.length;i++){
     var s = L[i];
     if(s.category === '기타' && s.type === 'general' && s.rank && !isLiberal(s)) B.push(s);
   }
   var aAvg = wavg(A, function(s){ return S(TA, s.rank); });
   var v = aAvg * 7;
   v += B.length ? wavg(B, function(s){ return S(TB, s.rank); }) * 1 : 100;
   return {v:v, n:A.length + B.length,
           ge:geOf(A, TA, function(s){ return S(TA, s.rank); })};
 }},

{g:'SKY / 서성한', n:'한양대', t:'학생부교과(추천형)', max:90, v:'f',
 note:'국·영·수·사·과·한국사 중 석차등급이 기재된 이수 전 과목 · 등급점수 이수단위 가중평균 ×0.9 · 석차등급 없이 성취도만 있는 진로선택과목은 정량평가 미반영 · <b>2027 수시 모집요강 확인:</b> 학생부교과 90 + 교과 정성평가 10, 최고점 1,000점, 모집 <b>346명</b>(시행계획 336명에서 증가), 수능최저 3개 영역 등급합 7 이내 · 등급 배점표는 모집요강 53쪽 (교과 정성평가 10점 제외)',
 calc:function(){
   var T = [100, 96, 89, 77, 60, 40, 23, 11, 0];
   var L = pick(['국어','수학','영어','과학','사회','한국사'], ['general']);
   if(!L.length) return {v:null};
   var a = wavg(L, function(s){ return S(T, s.rank); });
   return {v:a*0.9, n:L.length, ge:geOf(L, T, function(s){ return S(T, s.rank); })};
 }},

{g:'중경외시 / 이대', n:'중앙대', t:'지역균형', max:900, v:'f',
 note:'국·수·영·사·과 (<b>한국사 미포함</b>) · 공통/일반선택 90%(석차등급 환산점수) + 진로선택 10%(성취도 환산점수), ×90 · 등급 배점표(10.00~3.40)는 모집요강 공개분 (비교과 출결 100점 제외)',
 calc:function(){
   var T = [10, 9.71, 9.43, 9.14, 8.86, 8.57, 8.00, 6.57, 3.40];
   var C = ['국어','영어','수학','사회','과학'];
   var gen = pick(C, ['general']), car = pick(C, ['career']);
   if(!gen.length) return {v:null};
   var a = wavg(gen, function(s){ return S(T, s.rank); });
   var b = null;
   if(car.length){
     var t2 = 0;
     for(var i=0;i<car.length;i++) t2 += A3([10, 9.43, 8.86], car[i].ach);
     b = t2 / car.length;
   }
   var p = (b != null) ? a*0.9 + b*0.1 : a;
   return {v:p*90, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([10, 9.43, 8.86], s.ach); })};
 }},

{g:'중경외시 / 이대', n:'경희대', t:'학생부교과(지역균형)', max:70, v:'f',
 note:'공통/일반선택 80%(국·영·수·사·과·한국사) + 진로선택 20%(<b>한국사 제외</b> 5개 교과 중 상위 3과목, A100·B80·C60) → 학생부성적 700점 중 교과 부분 · 등급 배점표는 모집요강 공개분 (교과종합평가 300점 제외)',
 calc:function(){
   var T = [100, 96, 89, 77, 60, 40, 23, 11, 0];
   var gen = pick(['국어','영어','수학','사회','과학','한국사'], ['general']);
   if(!gen.length) return {v:null};
   var car = pick(['국어','영어','수학','사회','과학'], ['career']);
   car.sort(function(x,y){ return achOrd(y.ach) - achOrd(x.ach) || y.unit - x.unit; });
   car = car.slice(0, 3);
   var a = wavg(gen, function(s){ return S(T, s.rank); });
   var b = car.length ? wavg(car, function(s){ return A3([100, 80, 60], s.ach); }) : null;
   var p = (b != null) ? a*0.8 + b*0.2 : a;
   return {v:p*0.7, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([100, 80, 60], s.ach); })};
 }},

{g:'중경외시 / 이대', n:'한국외대', t:'학교장추천전형', max:1000, v:'f',
 note:'국·수·영·사(역사/도덕 포함)·과·한국사 전 과목 · 교과점수 = [Σ학점×(등급환산점수 또는 <b>원점수환산점수 중 상윗값</b>) + Σ학점×성취도환산점수] ÷ 총학점 · 진로선택 A=1등급·B=2등급·C=3등급 환산 · <b>졸업자도 3학년 1학기까지</b> · 원점수환산 공식이 비공개라 등급환산만 적용하므로 실제 점수는 이보다 높을 수 있음',
 calc:function(){
   var T = [1000, 960, 890, 770, 600, 400, 230, 110, 0];
   var L = upTo31(pick(['국어','수학','영어','사회','과학','한국사'], ['general','career']));
   if(!L.length) return {v:null};
   // 원점수환산점수표 (모집요강 38쪽). 수학은 구간이 다름.
   var CUT_ETC = [90, 85, 80, 75, 70, 60, 50, 40];
   var CUT_MATH = [90, 80, 70, 60, 50, 40, 30, 20];
   var rawScore = function(s){
     if(s.raw == null) return null;
     var c = (s.category === '수학') ? CUT_MATH : CUT_ETC;
     for(var k=0;k<8;k++){ if(s.raw >= c[k]) return T[k]; }
     return T[8];
   };
   var scoreF = function(s){
     if(s.type !== 'general') return A3([1000, 960, 890], s.ach);
     var g = S(T, s.rank), r = rawScore(s);
     return (r != null && r > g) ? r : g;   // 등급환산 vs 원점수환산 중 상윗값
   };
   var a = wavg(L, scoreF);
   return {v:a, n:L.length, ge:geOf(L, T, scoreF)};
 }},

{g:'중경외시 / 이대', n:'서울시립대', t:'고교추천전형', max:800, v:'f',
 note:'<b>2027 수시 모집요강 40쪽 원문 확인:</b> <b>전 교과</b> 반영(석차등급 기재 과목) · 공통·일반선택 석차등급 100·98·95·86·71·50·30·15·0 → ×7(700점) + 진로선택 성취도 A100·B97·C90 → ×1(100점) = 교과 800점 · 진로선택 이수단위가 0이면 공통·일반선택 점수 ×8 · 졸업예정자 3-1까지, 졸업생 3-1·2 모두 · 모집 254명, 수능최저 3개 영역 등급합 8 이내 + 한국사 4등급 (교과 정성평가 200점 제외)',
 calc:function(){
   var T = [100, 98, 95, 86, 71, 50, 30, 15, 0];
   var TC = [100, 97, 90];
   var L = act(), gen = [], car = [];
   for(var i=0;i<L.length;i++){
     var s = L[i];
     if(s.type === 'general' && s.rank) gen.push(s);
     else if(s.type === 'career' && s.ach) car.push(s);
   }
   if(!gen.length) return {v:null};
   var a = wavg(gen, function(s){ return S(T, s.rank); });
   var v, b = null;
   if(car.length){ b = wavg(car, function(s){ return A3(TC, s.ach); }); v = a*7 + b*1; }
   else { v = a*8; }
   return {v:v, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3(TC, s.ach); })};
 }},

{g:'중경외시 / 이대', n:'이화여대', t:'고교추천전형', max:10, v:'f',
 note:'국·수·영·한국사·사회(역사/도덕 포함)·과 · 석차등급 80%(10·9.6·9.2·8.6·7.8·7.0·5.0·2.0·0) + 진로선택 성취도 20%(A10·B8.6·C5.0), 이수학점 가중평균 · <b>졸업자도 3학년 1학기까지</b>',
 calc:function(){
   var T = [10, 9.6, 9.2, 8.6, 7.8, 7.0, 5.0, 2.0, 0];
   var C = ['국어','수학','영어','한국사','사회','과학'];
   var gen = upTo31(pick(C, ['general'])), car = upTo31(pick(C, ['career']));
   if(!gen.length) return {v:null};
   var a = wavg(gen, function(s){ return S(T, s.rank); });
   var b = car.length ? wavg(car, function(s){ return A3([10, 8.6, 5.0], s.ach); }) : null;
   var p = (b != null) ? a*0.8 + b*0.2 : a;
   return {v:p, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([10, 8.6, 5.0], s.ach); })};
 }},

{g:'건동홍', n:'건국대', t:'학생부교과(KU지역균형)', max:70, v:'f',
 note:'국·수·영·과·사·한국사 전 과목 · 기준점수 10·9.97·9.94·9.9·9.86·9.8·8·6·0 을 이수학점 가중평균 → 10점 만점 → ×0.7(700점) · 진로선택과목은 교과정성평가로만 반영 · 수능최저 없음 (교과정성 300점 제외)',
 calc:function(){
   var T = [10, 9.97, 9.94, 9.9, 9.86, 9.8, 8, 6, 0];
   var L = pick(['국어','수학','영어','과학','사회','한국사'], ['general']);
   if(!L.length) return {v:null};
   var a = wavg(L, function(s){ return S(T, s.rank); });
   return {v:a*7, n:L.length, ge:geOf(L, T, function(s){ return S(T, s.rank); })};
 }},

{g:'건동홍', n:'동국대', t:'학교장추천인재', max:70, v:'f',
 note:'인문=국·수·사·영·한국사 / 자연=국·수·과·영·한국사 · 등급점수 10·9.99·9.95·9.9·9.0·8.0·5.0·3.0·0 · <b>석차등급 상위 10과목만, 이수단위 미적용 단순평균</b> → ÷10 ×700점 · 수능최저 없음 (서류종합 300점 제외)',
 calc:function(tr){
   var T = [10.0, 9.99, 9.95, 9.9, 9.0, 8.0, 5.0, 3.0, 0];
   var C = (tr === 'science')
     ? ['국어','수학','과학','영어','한국사']
     : ['국어','수학','사회','영어','한국사'];
   var L = pick(C, ['general']);
   L.sort(function(a,b){ return a.rank - b.rank; });
   L = L.slice(0, 10);
   if(!L.length) return {v:null};
   var t = 0;
   for(var i=0;i<L.length;i++) t += S(T, L[i].rank);
   var avg = t / L.length;
   return {v: (avg/10)*70, n:L.length,
           ge: geOf(L, T, function(s){ return S(T, s.rank); }, function(){ return 1; }),
           warn: L.length < 10 ? '반영 과목이 10개 미만입니다 (지원자격 미달 가능)' : null};
 }},

{g:'건동홍', n:'홍익대', t:'학교장추천자전형(서울)', max:100, v:'f',
 note:'인문·예술=국·수·영·사(한국사/역사/도덕 포함) / 자연=국·수·영·과 · 공통·일반선택 90%(석차등급) + 진로선택 10%(성취도 A10·B9·C7) · 이수학점 가중치 적용 · <b>반영학기 1-1~3-1</b> · 등급 배점표는 모집요강 공개분',
 calc:function(tr){
   var T = [100, 96, 89, 77, 60, 40, 23, 11, 0];
   var C = cats(tr, true);
   var gen = upTo31(pick(C, ['general'])), car = upTo31(pick(C, ['career']));
   if(!gen.length) return {v:null};
   var raw = wavg(gen, function(s){ return S(T, s.rank); });
   var b = car.length ? wavg(car, function(s){ return A3([10, 9, 7], s.ach); }) : (raw * 0.09);
   return {v: (raw/100)*90 + b, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([10, 9, 7], s.ach) * 10; })};
 }},

{g:'아인숙', n:'아주대', t:'고교추천', max:100, v:'f',
 note:'<b>계열 구분 없이</b> 국어·수학·영어·사회·과학 5개 교과 전 과목(인문/자연 동일) · 등급점수 100·99·98·95·90·85·75·65·0 · 진로선택은 <b>반영교과 내 성취도 상위 5과목</b>을 A→1등급·B→2등급·C→4등급으로 환산해 일반과목과 함께 이수단위 가중평균 · <b>졸업생도 3학년 1학기까지</b> · 수능최저 있음(일반 2개영역 합 5, 의학 2개영역 합 6 이내 — 약학과는 이 전형 모집단위에 없음)',
 calc:bySpec({T:[100,99,98,95,90,85,75,65,0], upTo31:true,
   cats:['국어','수학','영어','사회','과학'],
   career:{mode:'merge', map:[1,2,4], top:5}})},

{g:'아인숙', n:'인하대', t:'지역균형', max:100, v:'n',
 note:'인문=국·수·영·사(한국사 포함) / 자연=국·수·영·과 전 과목 · 등급점수 100·98·96·90·80·70·50·30·0(⚠ 4~8등급 구간이 공식 문서와 다르다는 지적이 있으나 정확한 배점표를 확인하지 못해 미수정) · 진로선택 <b>성취도 상위 3과목</b>을 A→1등급·B→2등급·C→4등급으로 환산 · <b>졸업예정자 3-1까지 / 졸업자 3-2까지</b>(위의 3학년 2학기 옵션을 따름) · 수능최저 있음(인문·자연 2개영역 합 5, 의예과 3개영역 합 4 이내)',
 calc:bySpec({T:[100,98,96,90,80,70,50,30,0],
   cats:CT(['국어','수학','영어','사회','한국사'], ['국어','수학','영어','과학']),
   career:{mode:'merge', map:[1,2,4], top:3},
   warn:'2026-08-24 검증 보고서에서 이 배점표의 4~8등급 구간이 공식 문서와 다르다고 지적됐으나, 정확한 수정값을 확인하지 못해 배점표는 기존 값을 유지했습니다. 실제 배점은 인하대 입학처 모집요강 원문에서 직접 확인해주세요.'})},

{g:'아인숙', n:'숙명여대', t:'지역균형선발', max:100, v:'f',
 note:'<b>교과 70% + 서류 30%</b> 중 교과 70%만 100점 만점으로 환산한 값(공식 산출식은 (11-환산석차등급)×70, 700점 만점 · 100점 환산 시 등급점수가 선형으로 10점씩 감소) · <b>계열 구분 없이</b> 국어·수학·영어·사회(한국사 포함)·과학 5개 교과군 전 과목 반영 · 등급점수 100·90·80·70·60·50·40·30·20 · 진로선택과목 성취도(A→1등급·B→3등급·C→5등급 환산) <b>20% + 공통/일반선택 80%</b> 가중평균 · <b>졸업생도 3학년 1학기까지</b> · 일반학과 수능최저 폐지(약학부만 3개 합 5)',
 calc:bySpec({T:[100,90,80,70,60,50,40,30,20], upTo31:true,
   cats:['국어','수학','영어','사회','한국사','과학'],
   career:{mode:'split', pct:0.2, tbl:[100,80,60]}})},

{g:'국숭세단', n:'국민대', t:'교과우수자(학교장추천)', max:1000, v:'f',
 note:'인문=국·영·수·사 / 자연=국·영·수·과 · 배점 100·99·98·95·90·70·50·30·0 · 공통·일반선택 85% + 진로선택 15%(<b>성취도 상위 3과목</b>, 동점 시 이수단위 높은 순, A100·B98·C90) · 전문교과·제2외국어 미반영 · <b>재수생도 3학년 1학기까지</b>',
 calc:function(tr){
   var T = [100, 99, 98, 95, 90, 70, 50, 30, 0];
   var C = cats(tr, false);
   var gen = upTo31(pick(C, ['general']));
   var car = upTo31(pick(C, ['career']));
   car.sort(function(a,b){ return achOrd(b.ach) - achOrd(a.ach) || b.unit - a.unit; });
   car = car.slice(0, 3);
   if(!gen.length) return {v:null};
   var raw = wavg(gen, function(s){ return S(T, s.rank); });
   var b = car.length
     ? wavg(car, function(s){ return A3([100, 98, 90], s.ach); }) * 10 * 0.15
     : 1000 * 0.15;
   return {v: raw*10*0.85 + b, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([100, 98, 90], s.ach); })};
 }},

{g:'국숭세단', n:'숭실대', t:'교과우수자(학교장추천)', max:100, v:'f',
 note:'등급점수 10.0·9.5·9.0·8.5·8.0·7.0·5.0·3.0·0 · 공통·일반선택 80%에 <b>계열별 교과 가중치</b>(인문 국35·수15·영35·사15 / 경상 국20·수30·영35·사15 / 자연 국15·수35·영25·과25, 한국사는 사회에 포함) · 진로선택 20%(A=1등급·B=2등급·C=3등급 환산), 이수과목수별 최대취득비율 3과목이상 20%·2과목 18%·1과목 16%',
 calc:function(tr){
   var T = [10, 9.5, 9.0, 8.5, 8.0, 7.0, 5.0, 3.0, 0];
   var W = (tr === 'science')  ? {'국어':0.15, '수학':0.35, '영어':0.25, '과학':0.25}
         : (tr === 'commerce') ? {'국어':0.20, '수학':0.30, '영어':0.35, '사회':0.15}
         :                       {'국어':0.35, '수학':0.15, '영어':0.35, '사회':0.15};
   var keys = [];
   for(var k in W){ if(W.hasOwnProperty(k)) keys.push(k); }
   var scope = keys.concat(['한국사']);
   var gen = pick(scope, ['general']);
   if(!gen.length) return {v:null};
   var grp = function(c){ return c === '한국사' ? '사회' : c; };
   var acc = 0, wsum = 0;
   for(var i=0;i<keys.length;i++){
     var key = keys[i], L = [];
     for(var j=0;j<gen.length;j++){ if(grp(gen[j].category) === key) L.push(gen[j]); }
     if(!L.length) continue;
     acc += wavg(L, function(s){ return S(T, s.rank); }) * W[key];
     wsum += W[key];
   }
   if(!wsum) return {v:null};
   var base = acc / wsum;
   var p1 = base * 8;
   var car = pick(scope, ['career']);
   var ratio = car.length >= 3 ? 1.0 : car.length === 2 ? 0.9 : car.length === 1 ? 0.8 : 1.0;
   var p2 = car.length
     ? (wavg(car, function(s){ return A3([10, 9.5, 9.0], s.ach); }) / 10) * ratio * 20
     : 20;
   return {v: p1 + p2, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([10, 9.5, 9.0], s.ach); })};
 }},

{g:'국숭세단', n:'세종대', t:'지역균형', max:1000, v:'f',
 note:'자유전공=국·수·영 / 인문=국·수·영·사 / 자연=국·수·영·과 · 변환점수 1000·990·980·950·900·800·700·500·0 · 공통·일반선택 80% + 진로선택 20%(A→1등급 1000 · B→3등급 980 · C→5등급 900) · <b>3학년 1학기까지만</b> · P/F 과목 미반영',
 calc:function(tr){
   var T = [1000, 990, 980, 950, 900, 800, 700, 500, 0];
   var C = cats(tr, false);
   var gen = upTo31(pick(C, ['general'])), car = upTo31(pick(C, ['career']));
   if(!gen.length) return {v:null};
   var a = wavg(gen, function(s){ return S(T, s.rank); });
   var b = car.length ? wavg(car, function(s){ return A3([1000, 980, 900], s.ach); }) : null;
   var p = (b != null) ? a*0.8 + b*0.2 : a;
   return {v:p, n:gen.length+car.length,
           ge:geOf(gen.concat(car), T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([1000, 980, 900], s.ach); })};
 }},

{g:'국숭세단', n:'단국대', t:'지역균형선발(죽전)', max:95, v:'f',
 note:'국·영·수·사·과 (한국사는 사회에 포함) · 석차등급점수 100·99·98·97·96·95·70·40·0 을 이수단위 가중평균 ×0.95 · 진로선택 성취도는 A→1등급(100)·B→3등급(98)·C→5등급(96)으로 환산 후 동일 척도 합산 (비교과 출결 5점 제외)',
 calc:function(){
   var T = [100, 99, 98, 97, 96, 95, 70, 40, 0];
   var L = pick(['국어','수학','영어','사회','과학','한국사'], ['general','career']);
   if(!L.length) return {v:null};
   var scoreF = function(s){
     return s.type === 'general' ? S(T, s.rank) : A3([100, 98, 96], s.ach); };
   var a = wavg(L, scoreF);
   return {v:a*0.95, n:L.length, ge:geOf(L, T, scoreF)};
 }},

{g:'광명상가', n:'한국항공대', t:'학교장추천 / 교과성적우수자', max:100, v:'n',
 note:'공학·AI융합=국·수·영·과 / 항공경영·인문자유=국·수·영·사(한국사 포함) 전 과목 · 등급점수 100·98·95·90·80·60·40·20·0 · <b>졸업예정자 3-1 / 졸업자 3-2</b> · 학교장추천은 수능최저 없음, 교과성적우수자는 2개 합 6',
 calc:bySpec({T:[100,98,95,90,80,60,40,20,0],
   cats:CT(['국어','수학','영어','사회','한국사'], ['국어','수학','영어','과학']),
   career:{mode:'none'},
   warn:'진로선택 상위 3과목 가산점의 배점이 공개되지 않아 미반영했습니다 (실제 점수는 이보다 높을 수 있음)'})},

{g:'광명상가', n:'서울과기대', t:'고교추천', max:100, v:'n',
 note:'인문=국·수·영·사(한국사 포함) / 자연=국·수·영·과 전 과목 · <b>공통·일반선택 90% + 진로선택 10%</b>(성취도 상위 3과목 A100·B95·C85) · 등급점수 100·98·95·90·80·60·40·20·0 · <b>졸업생도 3학년 1학기까지</b> · 반영교과 80학점 이상 이수 조건, 수능최저 2개 합 7',
 calc:bySpec({T:[100,98,95,90,80,60,40,20,0], upTo31:true,
   cats:CT(['국어','수학','영어','사회','한국사'], ['국어','수학','영어','과학']),
   career:{mode:'split', pct:0.1, tbl:[100,95,85], top:3}})},

{g:'광명상가', n:'광운대', t:'지역균형전형', max:100, v:'f',
 note:'<b>2027 수시 모집요강 47쪽 원문 확인:</b> 교과성적 100%(비교과 없음), 학년별 반영비율 없음, <b>졸업여부에 관계없이 3학년 1학기까지</b>, 반영 교과(군) 국어·영어·수학·사회(한국사 포함)·과학의 <b>이수한 모든 과목</b>, 석차등급 및 이수학점 활용, 진로선택은 <b>A→1등급·B→2등급·C→4등급</b>, <b>과학탐구실험 미반영</b> · 모집 198명, 수능최저 없음, 지원자격 5개 학기 이상으로 강화 · 등급 배점표 숫자만 미확인',
 calc:function(){
   var T = [100, 98, 96, 94, 92, 88, 80, 70, 0];
   var L0 = upTo31(pick(['국어','영어','수학','사회','과학','한국사'], ['general','career']));
   var L = [];   // 과학탐구실험 미반영 (모집요강 명시)
   for(var i=0;i<L0.length;i++){
     if(L0[i].name.replace(/\s/g,'') === '과학탐구실험') continue;
     L.push(L0[i]);
   }
   if(!L.length) return {v:null};
   var scoreF = function(s){
     return s.type === 'general' ? S(T, s.rank) : A3([100, 98, 94], s.ach); };
   var a = wavg(L, scoreF);
   return {v:a, n:L.length, ge:geOf(L, T, scoreF)};
 }},

{g:'광명상가', n:'명지대', t:'학생부교과(학교장추천)', max:100, v:'f',
 note:'인문사회=국·수·영·사(한국사 포함) / 자연공학=국·수·영·과 · 등급점수 100·99·98·94·90·80·60·30·0, 진로선택 A=1등급·B=2등급·C이하=4등급 환산 · 이수학점 합계의 5% 가산점이 붙어 만점(100) 초과 가능 · <b>졸업생도 3학년 1학기까지</b> 반영 · <b>입학처 원문 미검증</b>',
 calc:function(tr){
   var T = [100, 99, 98, 94, 90, 80, 60, 30, 0];
   var L = upTo31(pick(cats(tr, true), ['general','career']));
   if(!L.length) return {v:null};
   var U = 0, base = 0;
   for(var i=0;i<L.length;i++){
     var s = L[i];
     U += s.unit;
     base += (s.type === 'general' ? S(T, s.rank) : A3([100, 99, 94], s.ach)) * s.unit;
   }
   return {v: (base + U*0.05)/U, n:L.length,
           ge: geOf(L, T, function(s){
             return s.type === 'general' ? S(T, s.rank) : A3([100, 99, 94], s.ach); })};
 }},

{g:'광명상가', n:'상명대', t:'고교추천전형(서울)', max:100, v:'f',
 note:'석차등급이 부여된 전 교과목 + 진로선택 우수 최대 3과목 · 등급점수 100·98·96·94·90·80·60·40·0, 성취도 A100·B96·C90 · 이수학점 가중평균 · <b>입학처 원문 미검증</b>',
 calc:function(){
   var L0 = act(), gen = [], car = [];
   for(var i=0;i<L0.length;i++){
     var s = L0[i];
     if(s.type === 'general' && s.rank) gen.push(s);
     else if(s.type === 'career' && s.ach) car.push(s);
   }
   car.sort(function(a,b){ return achOrd(b.ach) - achOrd(a.ach) || b.unit - a.unit; });
   car = car.slice(0, 3);
   var L = gen.concat(car);
   if(!L.length) return {v:null};
   var T = [100, 98, 96, 94, 90, 80, 60, 40, 0];
   var scoreF = function(s){
     return s.type === 'general' ? S(T, s.rank) : A3([100, 96, 90], s.ach); };
   var a = wavg(L, scoreF);
   return {v:a, n:L.length, ge:geOf(L, T, scoreF)};
 }},

{g:'광명상가', n:'가톨릭대', t:'지역균형전형(성심)', max:100, v:'f',
 note:'<b>2027 수시 모집요강 89쪽 원문 확인:</b> 반영교과 국어·수학·영어·한국사·사회(역사/도덕 포함)·과학의 <b>전 과목</b> · 교과 100%(비교과 없음) · 석차등급 배점 100·99·98·97·96·95·94·88·70 · 성취도는 <b>A→1등급·B→2등급·C→4등급</b>으로 변환 후 배점 적용 · 교과성적 = Σ(석차등급별 배점×학점)/Σ학점 · 학년별 가중치 없음, <b>졸업(예정)자 모두 3학년 1학기까지</b>(조기졸업은 2학년 1학기까지)',
 calc:function(){
   var T = [100, 99, 98, 97, 96, 95, 94, 88, 70];
   var L = upTo31(pick(['국어','영어','수학','한국사','사회','과학'], ['general','career']));
   if(!L.length) return {v:null};
   var scoreF = function(s){
     if(s.type === 'general') return S(T, s.rank);
     return S(T, s.ach === 'A' ? 1 : s.ach === 'B' ? 2 : 4); };
   var a = wavg(L, scoreF);
   return {v:a, n:L.length, ge:geOf(L, T, scoreF)};
 }},

{g:'수도권 사립·여대', n:'가천대', t:'학생부우수자 / 지역균형', max:100, v:'n',
 note:'인문=국·수·영·사 / 자연=국·수·영·과 · 등급점수 100·98·95·92·86·80·60·50·30 · <b>교과별 평균을 성적 좋은 순으로 35:30:20:15 가중</b> · 진로선택은 성취도 A이거나 <b>원점수 70점 이상이면 만점</b>, 그 외 B→2등급·C→4등급 · <b>졸업생도 3학년 1학기까지</b>',
 calc:bySpec({T:[100,98,95,92,86,80,60,50,30], upTo31:true,
   catRank:{w:[0.35,0.30,0.20,0.15]},
   career:{mode:'merge', map:[1,2,4], score:function(s, T){
     return (s.ach === 'A' || (s.raw != null && s.raw >= 70)) ? T[0]
          : S(T, s.ach === 'B' ? 2 : 4); }}})},

{g:'수도권 사립·여대', n:'경기대', t:'학교장추천 / 교과성적우수자', max:100, v:'n',
 note:'<b>교과 90% + 출결 10%</b> 중 교과만 100점 만점으로 환산한 값 · 인문=국·수·영·사(한국사 포함) / 자연=국·수·영·과 · 교과 안에서 <b>공통·일반 90% + 진로선택 10%</b>(A100·B99·C95, 이수 전 과목) · 등급점수 100·99·97·95·90·70·40·20·0 · <b>졸업생도 3학년 1학기까지</b>',
 calc:bySpec({T:[100,99,97,95,90,70,40,20,0], upTo31:true,
   cats:CT(['국어','수학','영어','사회','한국사'], ['국어','수학','영어','과학']),
   career:{mode:'split', pct:0.1, tbl:[100,99,95]}})},

{g:'수도권 사립·여대', n:'성신여대', t:'지역균형', max:100, v:'n',
 note:'<b>교과 90% + 출석 10%</b> 중 교과만 100점 만점으로 환산한 값 · 전 계열 국·수·영·사(한국사/도덕 포함)·과 이수 전 과목 · 등급점수 100·97·94·85·60·40·25·10·0 · 진로선택은 <b>상위 4과목</b>을 A→1·B→2·C→4등급으로 변환해 합산 · <b>졸업생도 3학년 1학기까지</b> · 수능최저 2개 합 7',
 calc:bySpec({T:[100,97,94,85,60,40,25,10,0], upTo31:true,
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'merge', map:[1,2,4], top:4}})},

{g:'수도권 사립·여대', n:'덕성여대', t:'고교추천', max:100, v:'n',
 note:'전 모집단위 국·영·수·사·과 중 석차등급이 산출되는 전 과목 · <b>공통·일반 90% + 진로선택 10%</b>(A100·B95·C85) · 등급점수 100·98·95·90·85·80·70·50·0 · <b>졸업생도 3학년 1학기까지</b> · 수능최저 있음(글로벌융합 2개 합 7)',
 calc:bySpec({T:[100,98,95,90,85,80,70,50,0], upTo31:true,
   cats:['국어','수학','영어','사회','과학'],
   career:{mode:'split', pct:0.1, tbl:[100,95,85]}})},

{g:'수도권 사립·여대', n:'서울여대', t:'교과우수자', max:100, v:'n',
 note:'인문·자연 공통으로 국·수·영·사·과 중 석차등급 산출 전 과목(<b>한국사 제외</b>) · 등급점수 100·97·93·85·70·50·35·20·0 · 진로선택은 <b>상위 3과목 가산점</b>(A 1.0·B 0.9·C 0.5의 평균, 최대 1점)이라 100점을 넘을 수 있음 · <b>졸업생도 3학년 1학기까지</b> · 수능최저 2개 합 7',
 calc:bySpec({T:[100,97,93,85,70,50,35,20,0], upTo31:true,
   cats:['국어','수학','영어','사회','과학'],
   career:{mode:'bonus', tbl:[1,0.9,0.5], top:3, avg:true}})},

{g:'수도권 사립·여대', n:'동덕여대', t:'학생부교과우수자', max:100, v:'n',
 note:'국·영·수 필수 + <b>사회 또는 과학 중 유리한 1개 교과</b>(이 계산기는 둘 다 계산해 높은 쪽을 씁니다) 전 과목 · 등급점수 100·98·96·94·90·80·70·60·40 · <b>진로선택 미반영</b> · 졸업예정자 3-1 / 졸업자 3-2 · 수능최저 2개 합 6',
 calc:bySpec({T:[100,98,96,94,90,80,70,60,40],
   cats:['국어','수학','영어'], optCat:['사회','과학'],
   career:{mode:'none'}})},

{g:'수도권 사립·여대', n:'수원대', t:'고교추천', max:100, v:'n',
 note:'인문=국·수·영·사 / 자연=국·수·영·과 · <b>교과별 상위 5과목씩 총 20과목</b>을 뽑아 교과 평균을 낸 뒤 성적 좋은 교과 순으로 30:30:25:15 가중 · 등급점수 100·98·96·94·90·80·70·60·40 · <b>진로선택 미반영</b> · 졸업예정자 3-1 / 졸업자 3-2 · 수능최저 없음',
 calc:bySpec({T:[100,98,96,94,90,80,70,60,40],
   catRank:{w:[0.30,0.30,0.25,0.15], top:5},
   career:{mode:'none'}})},

{g:'국공립대', n:'부산대', t:'학생부교과', max:100, v:'f',
 note:'<b>교과 80% + 학업역량 서류 20%</b> 중 교과만 100점 만점으로 환산한 값 · 전 계열 국·수·영·사·과·한국사 이수 전 과목 · 등급점수 100·99·98·97·96·95·90·60·0 · <b>진로선택과목(성취도 A/B/C만 있는 과목)은 정량 계산에서 제외</b>되고 학업역량평가(서류 20%)에서만 정성 반영 · 졸업예정자 3-1 / 졸업자 3-2 · 수능최저 있음(대부분 학과 2개영역 합 5 이내, 경영학과 3개영역 합 7 이내, 의예·치의예·약학·한의학전문대학원 수학 포함 3개영역 합 4 이내)',
 calc:bySpec({T:[100,99,98,97,96,95,90,60,0],
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'none'}})},

{g:'국공립대', n:'경북대', t:'교과우수자', max:400, v:'f',
 note:'학생부교과 <b>400점(80%)</b> + 서류평가 100점(20%) = 500점(100%) 중 교과 400점만 산출한 값 · <b>계열 구분 없이</b> 국어·수학·영어·사회·과학·한국사 전 과목 반영 · 등급점수 400·390·380·370·360·350·300·200·0 · <b>졸업자·졸업예정자 모두 3학년 1학기까지</b> · <b>진로선택은 정량 반영 없이 서류 20%(교과이수충실도)에서 정성평가</b>',
 calc:bySpec({T:[400,390,380,370,360,350,300,200,0], upTo31:true,
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'none'}})},

{g:'국공립대', n:'한국공학대', t:'교과우수자', max:500, v:'f',
 note:'학생부교과 100%(500점 만점) · 공학계열=국어·영어·수학·과학(한국사는 과학 교과에 포함) / 경영학부=국어·영어·수학·사회 또는 과학 중 <b>이수단위가 많은 쪽</b>(한국사도 그 교과에 포함) · <b>교과별 석차등급 상위 4과목만</b> 반영 · 등급점수 100·99·98·97·96·94·80·60·25 · 진로선택은 <b>반영교과 내 교과별 최대 2과목</b>(이수단위 1 고정)을 A→1등급·B→2등급·C→4등급으로 환산해 함께 반영 · 졸업예정자는 3학년 1학기까지(조기졸업예정자는 2학년 1학기까지) / 졸업생은 전 학기 반영 · 수능최저 있음(공학계열 2개영역 합 7, 경영학부 2개영역 합 8 — 수학 포함 시 미적분/기하 응시자는 수학영역 1등급 상향 특례)',
 calc:function(tr){
   var T = [100, 99, 98, 97, 96, 94, 80, 60, 25];
   var unitSum = function(cs){
     var L = pick(cs, ['general','career']), u = 0;
     for(var i=0;i<L.length;i++) u += L[i].unit;
     return u;
   };
   var isSci = tr === 'science';
   var thirdCat = isSci ? '과학' : (unitSum(['과학']) > unitSum(['사회']) ? '과학' : '사회');
   var C = isSci ? ['국어','영어','수학','과학','한국사'] : ['국어','영어','수학',thirdCat,'한국사'];
   // 교과별 상위 4과목(일반)·최대 2과목(진로선택)만 반영 — 나머지는 아예 계산에서 뺀다
   var byCat = function(list, n, sortFn){
     var groups = {}, out = [];
     for(var i=0;i<list.length;i++){
       var s = list[i];
       (groups[s.category] = groups[s.category] || []).push(s);
     }
     for(var k in groups){
       if(!groups.hasOwnProperty(k)) continue;
       var g = groups[k].slice();
       g.sort(sortFn);
       out = out.concat(g.slice(0, n));
     }
     return out;
   };
   var gen = byCat(pick(C, ['general']), 4, function(a,b){ return a.rank - b.rank; });
   if(!gen.length) return {v:null};
   var car = byCat(pick(C, ['career']), 2, function(a,b){ return achOrd(b.ach) - achOrd(a.ach); });
   var scoreF = function(s){ return s.type === 'general' ? S(T, s.rank) : A3([100, 99, 97], s.ach); };
   var weightF = function(s){ return s.type === 'general' ? s.unit : 1; };
   var use = gen.concat(car), u = 0, t = 0;
   for(var i=0;i<use.length;i++){ var w = weightF(use[i]); u += w; t += scoreF(use[i]) * w; }
   if(!u) return {v:null};
   var M = t/u;
   return {v: M*5, n:use.length, ge:geOf(use, T, scoreF, weightF)};
 }},

{g:'국공립대', n:'인천대', t:'교과성적우수자 / 지역균형', max:100, v:'n',
 note:'인문·패션·디자인=국30·영30·수20·사20 / 자연=수30·영30·국20·과20 <b>교과별 가중치</b> · 등급점수 100·98·95·90·80·60·40·20·0 · <b>총 이수단위 × 0.2 가산점</b>이 붙어 100점을 넘을 수 있음 · <b>졸업생도 3학년 1학기까지</b> · 교과우수자는 수능최저 2개 합 7, 지역균형은 없음',
 calc:bySpec({T:[100,98,95,90,80,60,40,20,0], upTo31:true, unitBonus:0.2,
   weights:function(tr){ return tr === 'science'
     ? {'수학':0.30, '영어':0.30, '국어':0.20, '과학':0.20}
     : {'국어':0.30, '영어':0.30, '수학':0.20, '사회':0.20}; },
   career:{mode:'none'}})},

{g:'국공립대', n:'충남대', t:'일반전형 / 지역인재', max:100, v:'n',
 note:'국·수·영·한국사·사회·과학 + <b>기술가정·제2외국어/한문</b> 전 과목 · 등급점수 100·90·80·70·60·50·40·30·20 · 진로선택은 A→1등급(100)·B→3등급(80)·C→5등급(60)으로 변환 후 이수단위 가중평균 · <b>졸업생도 3학년 1학기까지</b> · 수능최저 있음(일반 3개 합 12)',
 calc:bySpec({T:[100,90,80,70,60,50,40,30,20], upTo31:true,
   cats:['국어','수학','영어','사회','과학','한국사','기타'],
   career:{mode:'merge', map:[1,3,5]},
   warn:"기술가정·제2외국어/한문은 이 앱의 '기타' 교과로 입력해야 반영됩니다"})},

{g:'국공립대', n:'전남대', t:'일반전형 / 지역인재', max:900, v:'n',
 note:'<b>교과 900점(석차등급 885점 + 진로선택 15점) + 출결 100점</b> 중 교과 900점만 산출한 값 · 국·수·영·사(역사/도덕)·과·한국사 6개 교과군 이수 전 과목 · 등급점수 100·95·90·85·80·75·70·60·50 을 885점으로 환산 · 진로선택은 성취도 평균으로 A15·B9·C3점 가산 · <b>졸업생도 3학년 1학기까지</b>',
 calc:bySpec({T:[100,95,90,85,80,75,70,60,50], upTo31:true, scale:8.85,
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'bonus', tbl:[15,9,3], avg:true}})},

{g:'국공립대', n:'전북대', t:'일반학생', max:0, v:'n',
 note:'국·수·영·사(역사/도덕)·과·한국사 전 과목 · 진로선택은 <b>성취도 상위 3과목</b>을 A→1·B→2·C→3등급으로 환산 · <b>배점표가 1~3등급(100·95·90)까지만 공개돼 환산점수는 산출하지 않고 반영 교과 평균등급만 표시</b>합니다 · 졸업생도 3학년 1학기까지, 수능최저 있음',
 calc:bySpec({T:LIN, upTo31:true,
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'merge', map:[1,2,3], top:3}})},

{g:'국공립대', n:'충북대', t:'학생부교과', max:10, v:'n',
 note:'국·수·영·사(역사/도덕)·과·한국사 전 과목 · 배점 10.0·9.5·9.0·8.5·8.0·7.0·6.0·4.0·0 (10점 만점) · 진로선택은 A→1등급(10)·B→2등급(9.5)·C→3등급(9.0)으로 환산해 일반과목과 함께 이수단위 가중평균 · <b>졸업생도 3학년 1학기까지</b> · 출결 미반영',
 calc:bySpec({T:[10,9.5,9.0,8.5,8.0,7.0,6.0,4.0,0], upTo31:true,
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'merge', map:[1,2,3]}})},

{g:'국공립대', n:'강원대', t:'일반전형', max:1000, v:'n',
 note:'인문=국·영·수·사(도덕/역사)·한국사 / 자연=국·영·수·과·한국사 · 등급점수 1000·970·940·910·880·850·820·790·280 · 진로선택은 A→1·B→2·C→4등급으로 환산 후 일반과목과 함께 이수단위 가중평균 · <b>졸업생도 3학년 1학기까지</b> · 모집단위별 수능최저 상이',
 calc:bySpec({T:[1000,970,940,910,880,850,820,790,280], upTo31:true, hist:true,
   career:{mode:'merge', map:[1,2,4]}})},

{g:'국공립대', n:'제주대', t:'일반학생', max:100, v:'n',
 note:'인문=국·수·영·사(역사/도덕)·한국사 / 자연=국·수·영·과·한국사 · 등급점수 100·95·90·85·80·70·60·40·0 · 진로선택은 <b>상위 3과목</b>을 A→1·B→2·C→3등급으로 환산 · <b>졸업생도 3학년 1학기까지</b> · 모집단위별 수능최저 상이',
 calc:bySpec({T:[100,95,90,85,80,70,60,40,0], upTo31:true, hist:true,
   career:{mode:'merge', map:[1,2,3], top:3}})},

{g:'국공립대', n:'국립부경대', t:'교과성적우수인재', max:0, v:'n',
 note:'전 계열 국·수·영·사(역사/도덕)·과 이수 전 과목 · 진로선택은 A→1·B→2·C→3등급 환산 · <b>배점표가 1~5등급(100·98·95·90·85)까지만 공개돼 환산점수는 산출하지 않고 반영 교과 평균등급만 표시</b>합니다 · 졸업생도 3학년 1학기까지',
 calc:bySpec({T:LIN, upTo31:true,
   cats:['국어','수학','영어','사회','과학'],
   career:{mode:'merge', map:[1,2,3]}})},

{g:'국공립대', n:'국립한국해양대', t:'교과성적우수자 / 일반전형', max:0, v:'n',
 note:'인문=국·영·수·사(한국사 포함) / 자연=국·영·수·과 전 과목 · 진로선택은 <b>성취도 상위 3과목</b>을 A→1·B→4·C→7등급으로 환산 · <b>대학 환산점수표가 공개되지 않아 환산점수 대신 반영 교과 평균등급만 표시</b>합니다 · 졸업예정자 3-1 / 졸업자 3-2',
 calc:bySpec({T:LIN,
   cats:CT(['국어','수학','영어','사회','한국사'], ['국어','수학','영어','과학']),
   career:{mode:'merge', map:[1,4,7], top:3}})},

{g:'지역 사립대', n:'영남대', t:'일반학생', max:100, v:'n',
 note:'인문=국·수·영·사(역사/도덕)·한국사 / 자연=국·수·영·과·한국사 / 자율=전 교과 · 등급점수 100·95·90·85·80·70·60·40·0 · 진로선택은 <b>상위 3과목</b>을 A→1·B→2·C→3등급으로 환산 · <b>졸업생도 3학년 1학기까지</b> · 출결 미반영',
 calc:bySpec({T:[100,95,90,85,80,70,60,40,0], upTo31:true, hist:true,
   career:{mode:'merge', map:[1,2,3], top:3}})},

{g:'지역 사립대', n:'울산대', t:'일반교과', max:0, v:'n',
 note:'전 계열 국·수·영·사·과 전 과목(계열별 반영 교과가 같음) · 진로선택은 A→1·B→2·C→3등급 환산 · <b>배점표가 1~5등급(100·97·94·90·85)까지만 공개돼 환산점수는 산출하지 않고 반영 교과 평균등급만 표시</b>합니다 · 졸업생도 3학년 1학기까지',
 calc:bySpec({T:LIN, upTo31:true,
   cats:['국어','수학','영어','사회','과학'],
   career:{mode:'merge', map:[1,2,3]}})},

{g:'지역 사립대', n:'한림대', t:'교과우수자', max:0, v:'n',
 note:'국·영·수·사·과 중 <b>성적이 좋은 상위 3개 교과</b>를 각 1/3씩 반영 · 진로선택 성취도 A10·B8·C4점을 등급으로 되돌려(A→1·B→3·C→7등급) 합산 · <b>교과 900점 배점표가 공개되지 않아 환산점수 대신 반영 교과 평균등급만 표시</b>합니다 · 졸업예정자 3-1 / 졸업자 3-2 · 출결 10% 별도',
 calc:bySpec({T:LIN,
   cats:['국어','수학','영어','사회','과학'],
   catRank:{w:[1,1,1]},
   career:{mode:'merge', map:[1,3,7]},
   warn:'반영 교과 문구가 "국·영·수, 사 또는 과 중 상위 3개 교과"로 두 갈래로 읽혀, 국·영·수·사·과 5개 중 성적이 좋은 3개로 계산했습니다'})},

{g:'지역 사립대', n:'순천향대', t:'교과우수자', max:1000, v:'n',
 note:'국·수·영·사(한국사 포함)·과 중 이수한 전 과목 · 등급점수 1000·990·980·970·960·940·900·800·600 · 졸업예정자 3-1 / 졸업자 3-2 · 일반 모집단위는 수능최저 없음(의예 4개 합 6)',
 calc:bySpec({T:[1000,990,980,970,960,940,900,800,600],
   cats:['국어','수학','영어','사회','과학','한국사'],
   career:{mode:'merge', map:[1,2,4]},
   warn:'진로선택 성취도 처리 방식이 요강에 수치로 공개되지 않아 A→1·B→2·C→4등급 환산으로 가정했습니다'})}
];

/* ===== 렌더 ===== */
function render(){
  var tb = document.getElementById('uc-tb');
  document.getElementById('uc-cnt').textContent = SUBS.length + '과목';
  if(!SUBS.length){
    tb.innerHTML = '<tr><td colspan="10" class="c" style="padding:32px;color:var(--ink3)">아직 입력된 과목이 없습니다.</td></tr>';
    document.getElementById('uc-stat').innerHTML = '';
    return;
  }
  var label = {general:['일반','gen'], career:['진로','car'], peart:['체육·예술','pe']};
  var ord = [];
  for(var i=0;i<SUBS.length;i++) ord.push({s:SUBS[i], i:i});
  ord.sort(function(a,b){ return a.s.grade-b.s.grade || a.s.sem-b.s.sem; });
  var h = '';
  for(var j=0;j<ord.length;j++){
    var s = ord[j].s, idx = ord[j].i, sc = '-';
    if(s.raw != null){
      sc = s.raw + (s.mean != null ? '/'+s.mean : '') + (s.sd != null ? '('+s.sd+')' : '');
    }
    // 성취도별 분포비율(고려대 변환석차등급 근거) — 입력돼 있으면 그대로 보여준다
    var dist = (s.dA != null || s.dB != null || s.dC != null)
      ? ['A','B','C'].map(function(k){ var v = s['d'+k]; return v != null ? k+' '+v+'%' : null; })
          .filter(Boolean).join(' · ')
      : '-';
    h += '<tr><td class="c mono">'+s.grade+'</td><td class="c mono">'+s.sem+'</td>'
      + '<td>'+s.category+'</td><td>'+s.name+'</td><td class="c mono">'+s.unit+'</td>'
      + '<td class="c"><span class="chip '+label[s.type][1]+'">'+label[s.type][0]+'</span></td>'
      + '<td class="c mono"><b>'+(s.rank||'-')+'</b></td>'
      + '<td class="c mono">'+(s.ach||'-')+'</td>'
      + '<td class="c mono" style="font-size:11.5px;color:var(--ink3)">'+sc+'</td>'
      + '<td class="c mono" style="font-size:11.5px;color:var(--ink3)">'+dist+'</td>'
      + '</tr>';
  }
  tb.innerHTML = h;

  var A = act(), gen = [], main = [], car = 0, units = 0;
  for(var k=0;k<A.length;k++){
    units += A[k].unit;
    if(A[k].type === 'career') car++;
    if(A[k].type === 'general' && A[k].rank){
      gen.push(A[k]);
      if(MAIN.indexOf(A[k].category) >= 0) main.push(A[k]);
    }
  }
  var avg = function(L){
    var u=0,t=0; for(var z=0;z<L.length;z++){ u+=L[z].unit; t+=L[z].rank*L[z].unit; }
    return u ? t/u : null;
  };
  var a1 = avg(gen), a2 = avg(main);
  document.getElementById('uc-stat').innerHTML =
    '<div><span>전 과목 평균등급</span><b class="big mono">'+(a1?a1.toFixed(2):'-')+'</b></div>'
   +'<div><span>국·수·영·사·과·한국사 평균</span><b class="big mono">'+(a2?a2.toFixed(2):'-')+'</b></div>'
   +'<div><span>등급 산출 과목</span><b class="big mono">'+gen.length+'</b></div>'
   +'<div><span>진로선택 과목</span><b class="big mono">'+car+'</b></div>'
   +'<div><span>총 이수 학점</span><b class="big mono">'+units+'</b></div>';
}

var SORT = 'grp:1';
function setSort(k){
  var parts = SORT.split(':'), ck = parts[0], cd = parseInt(parts[1],10);
  var def = (k === 'pct' || k === 'ge') ? (k === 'pct' ? -1 : 1) : 1;
  SORT = (ck === k) ? (k + ':' + (-cd)) : (k + ':' + def);
  document.getElementById('uc-sort').value = SORT;
  calc();
}
var hdrs = document.querySelectorAll('#uc-res th.s');
for(var hi=0; hi<hdrs.length; hi++){
  hdrs[hi].title = '클릭해서 정렬';
  hdrs[hi].onclick = (function(th){ return function(){ setSort(th.dataset.k); }; })(hdrs[hi]);
}
function geColor(g){
  if(g == null) return 'var(--ink3)';
  if(g < 1.5) return '#166534';
  if(g < 2.5) return '#15803d';
  if(g < 3.5) return '#1f4ed8';
  if(g < 4.5) return '#4b5563';
  if(g < 6)   return '#b45309';
  return '#b91c1c';
}
var VB = {f:['원문확인','f'], p:['일부확인','p'], n:['미검증','n']};

function calc(){
  var rb = document.getElementById('uc-rb');
  var sel = document.getElementById('uc-sort');
  if(sel && sel.value !== SORT) SORT = sel.value;
  if(!SUBS.length){
    rb.innerHTML = '<tr><td colspan="9" class="c" style="padding:32px;color:var(--ink3)">성적을 먼저 입력하세요.</td></tr>';
    return;
  }
  var tr = document.getElementById('uc-track').value;
  var rows = [];
  for(var i=0;i<UNIV.length;i++){
    var u = UNIV[i], r;
    try{ r = u.calc(tr) || {}; }catch(e){ r = {v:null, err:e.message}; }
    var has = (r.v != null) && isFinite(r.v) && u.max > 0;
    rows.push({ u:u, r:r, i:i, has:has,
      v: has ? r.v : null,
      pct: has ? (r.v/u.max)*100 : null,
      ge: (r.ge != null && isFinite(r.ge)) ? Math.max(1, Math.min(9, r.ge)) : null });
  }
  var parts = SORT.split(':'), key = parts[0], dir = parseInt(parts[1],10);
  if(key !== 'grp'){
    rows.sort(function(a,b){
      if(key === 'name') return dir * a.u.n.localeCompare(b.u.n, 'ko');
      var av = a[key], bv = b[key];
      if(av == null && bv == null) return a.i - b.i;
      if(av == null) return 1;
      if(bv == null) return -1;
      return dir*(av-bv) || (a.i-b.i);
    });
  }
  for(var z=0; z<hdrs.length; z++){
    var ic = hdrs[z].querySelector('i');
    ic.textContent = hdrs[z].dataset.k === key ? (dir > 0 ? ' ▲' : ' ▼') : '';
    ic.style.cssText = 'font-style:normal;color:var(--brand);font-size:10px';
  }
  var grouped = (key === 'grp'), html = '', lastG = '', no = 0;
  for(var m=0;m<rows.length;m++){
    var R = rows[m], U = R.u;
    if(grouped && U.g !== lastG){
      html += '<tr><td colspan="9" class="grp">'+U.g+'</td></tr>';
      lastG = U.g;
    }
    var dec = U.max <= 10 ? 4 : U.max <= 100 ? 3 : 2;
    if(R.has) no++;
    var rank = (!grouped && R.has) ? '<span class="rk">'+no+'</span>' : '';
    var vb = VB[U.v];
    html += '<tr>'
      + '<td style="font-size:11.5px;color:var(--ink3);white-space:nowrap">'+U.g+'</td>'
      + '<td style="white-space:nowrap">'+rank+'<b>'+U.n+'</b><span class="vb '+vb[1]+'">'+vb[0]+'</span></td>'
      + '<td style="font-size:12.5px;color:var(--ink2)">'+U.t+'</td>'
      + '<td class="r mono"><b style="font-size:15px">'+(R.has ? R.v.toFixed(dec) : '—')+'</b></td>'
      + '<td class="r mono" style="color:var(--ink3)">'+(U.max || '—')+'</td>'
      + '<td>'+(R.has
          ? '<div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:'
            + Math.max(0, Math.min(100, R.pct)) + '%"></i></div><span class="mono" style="font-size:12px;color:var(--ink2);min-width:46px;text-align:right">'
            + R.pct.toFixed(1) + '%</span></div>'
          : '<span style="color:var(--ink3);font-size:12px">'
            + ((R.r.v != null && !(U.max > 0)) ? '배점표 미공개 (환산등급만)' : '계산 불가')
            + '</span>')+'</td>'
      + '<td class="r mono"><b style="font-size:15px;color:'+geColor(R.ge)+'">'
        + (R.ge != null ? R.ge.toFixed(2) : '—') + '</b>'
        + '<span style="font-size:10.5px;color:var(--ink3)">'+(R.ge != null ? '등급' : '')+'</span></td>'
      + '<td class="c mono" style="color:var(--ink3)">'+(R.r.n != null ? R.r.n : '—')+'</td>'
      + '<td style="font-size:11.5px;color:var(--ink3);line-height:1.5">'+U.note
        + (R.r.warn ? '<br><b style="color:var(--warn)">⚠ '+R.r.warn+'</b>' : '')+'</td>'
      + '</tr>';
  }
  rb.innerHTML = html;
}

refresh();


  // ── 단일 원본: 이 앱의 "학기별 성적 입력"(calcData) ──
  // 예전엔 이 계산기가 SUBS라는 자기만의 과목 목록을 따로 들고 있어서 같은 성적을 두 번
  // 넣어야 했다. 이제 calcData 하나만 보고, 그게 바뀔 때마다(calcAll에서 refresh 호출)
  // 다시 계산한다. SUBS는 계산 직전에 calcData에서 파생되는 임시 배열일 뿐이다.
  function syncFromCalcData(){
    if(typeof calcData === 'undefined' || !calcData){ SUBS = []; return; }
    // 앱 교과군의 legacy '탐구'는 사회/과학 구분이 없다 — 계열 선택값으로 배정한다.
    var trackEl = document.getElementById('uc-track');
    var explore = (trackEl && trackEl.value === 'science') ? '과학' : '사회';
    var out = [];
    Object.keys(calcData).forEach(function(sem){
      var m = String(sem).match(/^(\d)-(\d)$/); if(!m) return;
      (calcData[sem] || []).forEach(function(r){
        if(!r || !r.name) return;
        var cat = (r.category === '탐구') ? explore : r.category;
        var isGen = r.type === 'general';
        var ach = String(r.achievement || '').toUpperCase();
        if(isGen && !(r.grade >= 1 && r.grade <= 9)) return;
        if(!isGen && ['A','B','C'].indexOf(ach) < 0) return; // P(이수)는 대학 반영 대상이 아님
        out.push({ grade:parseInt(m[1],10), sem:parseInt(m[2],10), category:normCat(cat),
          name:String(r.name), unit:Number(r.unit) || 1, type:r.type || 'general',
          rank:isGen ? Number(r.grade) : null, ach:ach || null,
          raw:r.raw != null ? Number(r.raw) : null, mean:r.mean != null ? Number(r.mean) : null,
          sd:r.sd != null ? Number(r.sd) : null, count:null,
          dA:r.dA != null ? Number(r.dA) : null, dB:r.dB != null ? Number(r.dB) : null,
          dC:r.dC != null ? Number(r.dC) : null });
      });
    });
    SUBS = out;
  }
  function refresh(){ syncFromCalcData(); render(); calc(); }

  // 나이스+ 생기부 HTML을 파싱해 **calcData에 직접** 써넣는다 — 이 계산기 전용 목록이 아니라
  // 위 학기별 입력이 채워지므로, 한 번 올리면 교과군 평균과 대학 환산점수가 동시에 갱신된다.
  function importNeisIntoCalcData(htmlText){
    var parsed = parseNeisRows(htmlText);
    if(!parsed.length){ toast('교과 성적 표를 찾지 못했어요. 나이스+ 「학교생활기록부」 화면 전체를 HTML로 저장했는지 확인해주세요'); return 0; }
    CALC_SEMESTERS.forEach(function(sem){ calcData[sem] = []; });
    var n = 0;
    parsed.forEach(function(s){
      var key = s.grade + '-' + s.sem;
      if(!calcData[key]) return;
      var row = { name:s.name, category:s.category, unit:s.unit, type:s.type };
      if(s.type === 'general') row.grade = s.rank; else row.achievement = s.ach;
      if(s.ach) row.achievement = s.ach;
      ['raw','mean','sd','dA','dB','dC'].forEach(function(k){ if(s[k] != null) row[k] = s[k]; });
      var clean = sanitizeCalcRow(row);
      if(clean){ calcData[key].push(clean); n++; }
    });
    return n;
  }

  // 인라인 핸들러(onclick)에서 쓰는 진입점만 공개
  window.UC = {
    setSort: setSort, calc: calc, refresh: refresh,
    importNeisIntoCalcData: importNeisIntoCalcData
  };
})();

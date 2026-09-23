const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const replacement = `
<!-- <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" crossorigin="anonymous" onerror="window.__sbLoadFailed=1"></script> -->
<script>
  window.__sbLoadFailed=1;
  document.addEventListener('DOMContentLoaded',function(){
    var d=document.createElement('div');
    d.setAttribute('style','position:fixed;inset:0;z-index:9999;background:#fff;color:#1d1d1f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:28px;text-align:center;font-family:system-ui,-apple-system,sans-serif');
    d.innerHTML='<div style="font-size:34px">🚧</div>'+
      '<div style="font-size:17px;font-weight:600">서버 트래픽 초과로 점검 중입니다</div>'+
      '<div style="font-size:14px;line-height:1.6;color:#7a7a7a;max-width:320px">오늘(12일) 중으로 서버 용량 초기화 및<br>최적화 작업이 완료된 후 다시 접속 가능합니다.<br>이용에 불편을 드려 죄송합니다.</div>';
    document.body.appendChild(d);
  });
</script>
`;

const regex = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"[^>]*><\/script>\s*<script>[\s\S]*?<\/script>/;
if(regex.test(html)) {
  html = html.replace(regex, replacement);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Successfully replaced');
} else {
  console.log('Regex did not match');
}

// 푸시 알림 + 앱 셸(코드) 캐싱용 서비스 워커.
//
// **데이터는 절대 캐시하지 않는다.** 이 앱은 항상 최신 데이터를 봐야 하는 대시보드라,
// 낡은 데이터를 보여주면 쓸모가 없다. 그래서 Supabase 같은 외부(cross-origin) 요청은
// 아예 가로채지 않고, 우리 도메인의 정적 파일(index.html/아이콘/매니페스트)만 캐시한다.
//
// 왜 캐시가 필요해졌나: index.html 하나에 코드가 다 들어있어서 700KB가 넘는데, 캐시가
// 없으면 앱을 열 때마다 이걸 통째로 다시 받는다(모바일 데이터·느린 와이파이에서 그대로 렉).
// **캐시 우선(cache-first)** — 캐시에 있으면 네트워크를 아예 안 쓴다.
// 예전엔 stale-while-revalidate라서 캐시로 화면을 그리면서도 뒤에서 240KB를 매번 다시 받았다.
// 느린 회선에서는 그 배경 다운로드가 로그인·목록 같은 실제 API 요청과 대역폭을 나눠 쓰면서
// "열리긴 했는데 한참 안 돌아가는" 상태를 만든다. 캐시 이름에 SW_BUILD가 들어 있어서
// **캐시에 있는 셸 = 지금 이 워커가 설치될 때 받아둔 그 버전**이므로 매번 확인할 이유가 없다.
// 새 버전이 배포되면 SW_BUILD가 바뀌며 새 워커가 설치되고 → 앱이 "새로고침하기" 배너를
// 띄우고 → 새로고침하면 새 셸이 뜬다(기존 업데이트 흐름 그대로).

// index.html이 바뀌어도 이 파일 자체는 안 바뀌면 브라우저가 "새 버전이 있다"는 걸 감지 못
// 한다(서비스 워커 업데이트는 이 파일의 바이트가 달라졌을 때만 트리거됨) — 그래서 index.html에
// 의미 있는 변경이 생겨 배포할 때마다 이 값을 같이 올려서, 새 버전 배포 시 이 파일도 함께
// 바뀌게 만든다. 값 자체는 로직에서 안 쓰고 순전히 "새 버전 신호"용.
const SW_BUILD = '2026-09-05-50';

// index.html이 "새로고침하기" 배너에서 새 워커를 즉시 활성화시키려고 보내는 메시지
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// 앱 셸 캐시 — 이름에 SW_BUILD가 들어가서 배포할 때마다 새 캐시가 생기고 옛 캐시는 버려진다.
const SHELL_CACHE = 'bugwang-shell-' + SW_BUILD;
const SHELL_URLS = ['./', './index.html', './manifest.json', './uc.js'];
// 라이브러리(코드)는 데이터가 아니므로 캐시해도 안전하다. 매번 바깥 CDN에 DNS+TLS+120KB를
// 새로 쓰지 않도록 이것만 예외로 캐시한다(캐시 이름이 배포마다 바뀌니 자동으로 갱신됨).
const CDN_PREFIX = 'https://cdn.jsdelivr.net/';

// 새 워커를 설치할 때 셸을 미리 받아둔다. cache:'reload'로 브라우저 HTTP 캐시를 건너뛰어
// 항상 "방금 배포된" 파일이 담기게 한다(안 그러면 옛 파일이 새 캐시에 그대로 복사될 수 있다).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(SHELL_URLS.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    ).catch(() => {})
  );
});

// skipWaiting으로 새 워커가 활성화되자마자 이미 열려있는 탭까지 바로 이어받게(그래야
// index.html 쪽의 controllerchange 이벤트가 곧바로 발생해서 새로고침 흐름이 이어짐)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url) } catch (e) { return }
  // 외부(Supabase API 등)는 절대 손대지 않는다 — 데이터는 항상 네트워크에서.
  // 딱 하나, jsdelivr에서 받는 라이브러리 파일만 캐시 대상으로 허용한다.
  const isLib = req.url.indexOf(CDN_PREFIX) === 0;
  if (url.origin !== self.location.origin && !isLib) return;
  // 서비스워커 자신을 캐시하면 새 버전을 영영 감지 못 한다.
  if (url.pathname.endsWith('/sw.js')) return;

  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // 문서는 ?query가 붙어도 같은 셸로 본다(주소에 파라미터가 붙는 경로 대비).
    const cached = await cache.match(req, { ignoreSearch: isDoc });
    if (cached) return cached; // 캐시 우선 — 네트워크는 아예 건드리지 않는다
    // 캐시에 없을 때만(첫 방문, 새로 추가된 파일, 프리캐시 실패) 네트워크에서 받아 담아둔다.
    try {
      const res = await fetch(req);
      if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  // 원본(글·댓글·DM)이 지워지면 서버가 "닫기 푸시"를 보낸다 — 새 알림을 띄우는 대신 이미
  // 떠 있는 알림 중 해당 tag를 가진 것을 닫는다(요청: "알람 켜놓은 사람한테 온 알람도
  // 지워지게"). tag는 그 알림을 만든 원본 id(댓글 id / DM 메시지 id).
  if (data.close) {
    const tags = Array.isArray(data.close) ? data.close : [data.close];
    event.waitUntil(
      self.registration.getNotifications().then((shown) => {
        shown.forEach((n) => {
          const t = n.tag || (n.data && n.data.tag);
          if (tags.indexOf(t) !== -1) n.close();
        });
      })
    );
    return;
  }
  const title = data.title || '부광 3-1 대시보드';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    // tag를 달아둬야 나중에 이 알림 하나를 찾아서 닫을 수 있다. 원본 id라서 서로 겹치지
    // 않으므로 기존처럼 여러 알림이 그대로 쌓인다.
    tag: data.tag || undefined,
    data: { url: data.url || './index.html', tag: data.tag || null, refId: data.refId || null },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림을 누르면 이미 열려있는 탭이 있으면 그쪽으로 포커스, 없으면 새로 연다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// 푸시 알림 전용 서비스 워커. 오프라인 캐싱 등은 하지 않는다 — 이 앱은 항상 최신 데이터를
// 봐야 하는 대시보드라, 캐시가 낡은 화면을 보여주면 오히려 더 혼란스럽다.

// index.html이 바뀌어도 이 파일 자체는 안 바뀌면 브라우저가 "새 버전이 있다"는 걸 감지 못
// 한다(서비스 워커 업데이트는 이 파일의 바이트가 달라졌을 때만 트리거됨) — 그래서 index.html에
// 의미 있는 변경이 생겨 배포할 때마다 이 값을 같이 올려서, 새 버전 배포 시 이 파일도 함께
// 바뀌게 만든다. 값 자체는 로직에서 안 쓰고 순전히 "새 버전 신호"용.
const SW_BUILD = '2026-07-22-1';

// index.html이 "새로고침하기" 배너에서 새 워커를 즉시 활성화시키려고 보내는 메시지
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// skipWaiting으로 새 워커가 활성화되자마자 이미 열려있는 탭까지 바로 이어받게(그래야
// index.html 쪽의 controllerchange 이벤트가 곧바로 발생해서 새로고침 흐름이 이어짐)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '부광 3-1 대시보드';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: data.url || './index.html' },
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

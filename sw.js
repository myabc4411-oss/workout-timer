// === Workout Timer PRO — Service Worker ===
// 인터넷이 없어도 앱이 즉시 열리도록 파일을 폰에 캐싱해둡니다.
// 배포할 때마다 index.html의 APP_BUILD, version.json의 build와 함께
// 아래 CACHE_VERSION도 같이 올려주세요 (그래야 새 버전이 확실히 적용됩니다).
const CACHE_VERSION = '20260815-13';
const CACHE_NAME = 'wt-cache-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // cache.addAll은 파일 하나라도 실패하면 전체가 통째로 실패하는 방식이라,
      // 아이콘 경로 하나가 안 맞아도 index.html 등 핵심 파일까지 못 받는 사고가 생겼음.
      // 파일별로 따로 시도해서, 실패한 파일만 건너뛰고 나머지는 확실히 캐싱되도록 함.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url)
            .then((res) => { if (res && res.ok) return cache.put(url, res); })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// 네트워크 우선 — 인터넷이 있으면 항상 최신 파일을 받아오고(기존 자동 업데이트 기능과 호환),
// 실패했을 때(오프라인)만 캐시해둔 파일로 대신 응답합니다.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 구글 폰트/로그인 등 외부 요청은 손대지 않음

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});

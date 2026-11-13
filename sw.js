/* 帳本 Service Worker — 快取外殼，離線可用 */
const CACHE = 'ledger-v2-5';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/util.js',
  './js/i18n.js',
  './js/db.js',
  './js/charts.js',
  './js/insights.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/cat/meal.png', './icons/cat/meal.svg',
  './icons/cat/drink.png', './icons/cat/drink.svg',
  './icons/cat/misc.png', './icons/cat/misc.svg',
  './icons/cat/clothing.png', './icons/cat/clothing.svg',
  './icons/cat/housing.png', './icons/cat/housing.svg',
  './icons/cat/transport.png', './icons/cat/transport.svg',
  './icons/cat/tuition.png', './icons/cat/tuition.svg',
  './icons/cat/fun.png', './icons/cat/fun.svg',
  './icons/cat/health.png', './icons/cat/health.svg',
  './icons/cat/telecom.png', './icons/cat/telecom.svg',
  './icons/cat/water.png', './icons/cat/water.svg',
  './icons/cat/power.png', './icons/cat/power.svg',
  './icons/cat/gas.png', './icons/cat/gas.svg',
  './icons/cat/insurance.png', './icons/cat/insurance.svg',
  './icons/cat/tax.png', './icons/cat/tax.svg',
  './icons/cat/parking.png', './icons/cat/parking.svg',
  './icons/cat/tunnel.png', './icons/cat/tunnel.svg',
  './icons/cat/fuel.png', './icons/cat/fuel.svg',
  './icons/cat/carcare.png', './icons/cat/carcare.svg',
  './icons/cat/salary.svg',
  './icons/cat/rates.png', './icons/cat/rates.svg',
  './icons/cat/household.png', './icons/cat/household.svg',
  './icons/cat/homeuse.png', './icons/cat/homeuse.svg',
  './icons/cat/lpg.png', './icons/cat/lpg.svg',
  './icons/cat/laundry.svg',
  './icons/cat/pets.png', './icons/cat/pets.svg',
  './icons/cat/beauty.svg',
  './icons/cat/fitness.png', './icons/cat/fitness.svg',
  './icons/cat/subs.png', './icons/cat/subs.svg',
  './icons/cat/gifts.png', './icons/cat/gifts.svg',
  './icons/cat/travel.png', './icons/cat/travel.svg',
  './icons/cat/repairs.png', './icons/cat/repairs.svg',
  './icons/cat/alcohol.png', './icons/cat/alcohol.svg',
  './icons/cat/childcare.png', './icons/cat/childcare.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'offline' });
        });
    })
  );
});

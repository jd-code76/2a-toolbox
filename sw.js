const CORE_ASSETS = [
    '/',
    '/index.html',
    '/main.js',
    '/sw.js',
    '/styles.css',
    '/manifest.json',
    '/modules/ammo.js',
    '/modules/ammo-deduction.js',
    '/modules/database.js',
    '/modules/events.js',
    '/modules/guns.js',
    '/modules/import-export.js',
    '/modules/navigation.js',
    '/modules/renderers.js',
    '/modules/sessions.js',
    '/modules/state.js',
    '/modules/utils.js',
    '/favicons/apple-touch-icon.png',
    '/favicons/favicon.png',
    '/favicons/favicon-192x192.png',
    '/favicons/favicon-512x512.png'
];
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css'
];
let CURRENT_CACHE = null;
self.addEventListener('message', e => {
    if (e.data?.type === 'VERSION') {
        CURRENT_CACHE = `2atoolbox-cache-v${e.data.version}`;
        preCacheCoreAssets();
    }
});
async function preCacheCoreAssets() {
    if (!CURRENT_CACHE) return;
    const cache = await caches.open(CURRENT_CACHE);
    try {
        await cache.addAll(
            CORE_ASSETS.map(u => new Request(u, { credentials: 'same-origin' }))
        );
        await cache.addAll(
            CDN_ASSETS.map(u => new Request(u, { mode: 'cors' }))
        );
        console.log('Core assets cached under', CURRENT_CACHE);
    } catch (err) {
        console.error('Failed to pre-cache core assets:', err);
    }
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', evt => {
    evt.waitUntil(
        (async () => {
            const expected = CURRENT_CACHE || `2atoolbox-cache-v1`;
            const names = await caches.keys();
            await Promise.all(
                names.map(name =>
                    name !== expected && name.startsWith('2atoolbox-cache-v')
                        ? caches.delete(name)
                        : null
                )
            );
            await self.clients.claim();
        })()
    );
});
self.addEventListener('fetch', evt => {
    if (evt.request.method !== 'GET') return;
    const isCDN = evt.request.url.startsWith('https://cdn.jsdelivr.net/');
    if (evt.request.mode === 'navigate') {
        evt.respondWith(
            fetch(evt.request)
                .then(resp => {
                    if (shouldCache(evt.request, resp)) {
                        const copy = resp.clone();
                        caches.open(CURRENT_CACHE).then(c => c.put(evt.request, copy));
                    }
                    return resp;
                })
                .catch(() => caches.match(evt.request).then(c => c || caches.match('./index.html')))
        );
        return;
    }
    if (isCDN) {
        evt.respondWith(
            fetch(evt.request)
                .then(resp => {
                    if (resp.ok) {
                        const copy = resp.clone();
                        caches.open(CURRENT_CACHE).then(c => c.put(evt.request, copy));
                    }
                    return resp;
                })
                .catch(() => caches.match(evt.request))
        );
        return;
    }
    evt.respondWith(
        fetch(evt.request)
            .then(resp => {
                if (shouldCache(evt.request, resp)) {
                    const copy = resp.clone();
                    caches.open(CURRENT_CACHE).then(c => c.put(evt.request, copy));
                }
                return resp;
            })
            .catch(() => caches.match(evt.request))
    );
});
function shouldCache(request, response) {
    return (
        CURRENT_CACHE &&
        isHttpScheme(request.url) &&
        response.type !== 'opaque' &&
        response.status === 200
    );
}
function isHttpScheme(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
        return false;
    }
}
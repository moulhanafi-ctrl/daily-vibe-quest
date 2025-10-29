// Kill-switch service worker to clean up old registrations
// This ensures any browsers with stale service workers get cleaned up

self.addEventListener('install', (e) => {
  console.log('[Kill-switch SW] Installing - clearing all caches');
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Kill-switch SW] Activating - unregistering and reloading');
  e.waitUntil((async () => {
    try {
      await self.registration.unregister();
      console.log('[Kill-switch SW] Unregistered successfully');
    } catch (err) {
      console.warn('[Kill-switch SW] Unregister failed:', err);
    } finally {
      await self.clients.claim();
      const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      console.log(`[Kill-switch SW] Reloading ${pages.length} pages`);
      for (const c of pages) c.navigate(c.url);
    }
  })());
});

// No fetch interception - let all requests go through
self.addEventListener('fetch', () => {});

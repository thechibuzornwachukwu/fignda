// Service worker for the daily reminder. It does one job: show a notification when a push arrives and open the
// daily when it is tapped. It caches nothing and never touches page requests.
// The push itself is empty, so the line to show is asked for from the API (see worker/src/app.ts pushLine).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function showReminder() {
  // Used only if the API cannot be reached.
  let line = { title: 'Gazecraft', body: "Today's puzzle is up.", url: '/play' };
  try {
    const sub = await self.registration.pushManager.getSubscription();
    const res = await fetch('/api/push/line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub ? sub.endpoint : '' }),
    });
    if (res.ok) {
      const body = await res.json();
      if (body && typeof body.body === 'string') line = { title: String(body.title || line.title), body: body.body, url: String(body.url || line.url) };
    }
  } catch {
    /* offline: the fallback line is fine */
  }
  await self.registration.showNotification(line.title, {
    body: line.body,
    icon: '/brand/icon-180.png',
    badge: '/brand/icon-32.png',
    // One reminder at a time: a new one replaces yesterday's if it was never opened.
    tag: 'daily',
    data: { url: line.url },
  });
}

self.addEventListener('push', (event) => event.waitUntil(showReminder()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Same-site paths only.
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/play';
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of open) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(path).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(path);
    })(),
  );
});

#!/usr/bin/env node
/**
 * Send a Web Push notification straight to a subscription, no backend involved.
 * Used to prove the notification path works before the Worker is deployed.
 *
 *   cd tools && npm install
 *   node send-test-push.js '<subscription JSON from the Alerts screen>'
 *
 * Reads VAPID keys from ../.env (gitignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

const here = path.dirname(fileURLToPath(import.meta.url));

const env = Object.fromEntries(
  fs.readFileSync(path.join(here, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

for (const key of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']) {
  if (!env[key]) {
    console.error(`Missing ${key} in ../.env`);
    process.exit(1);
  }
}

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

const raw = process.argv[2];
if (!raw) {
  console.error("usage: node send-test-push.js '<subscription JSON>'");
  process.exit(1);
}

let subscription;
try {
  subscription = JSON.parse(raw);
} catch {
  console.error('That is not valid JSON. Copy the whole object from the Alerts screen.');
  process.exit(1);
}

const payload = JSON.stringify({
  title: 'Eli Vargas is not starting',
  body: '3B · @ SD · Start Owen Brandt instead',
  tag: 'scratched',
  url: '/',
  data: { type: 'scratched', players: ['p.4'] },
});

try {
  const res = await webpush.sendNotification(subscription, payload);
  console.log('Sent. Status', res.statusCode);
} catch (e) {
  console.error('Failed:', e.statusCode, e.body || e.message);
  if (e.statusCode === 410 || e.statusCode === 404) {
    console.error('That subscription is gone — re-enable alerts in the app to get a new one.');
  }
  process.exit(1);
}

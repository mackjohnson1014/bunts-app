# Push notifications

Bunts delivers its scratch alerts as **Web Push to an installed PWA**. No Apple
Developer membership, no App Store, no build pipeline.

## What iOS requires

| Requirement | Why it bites |
|---|---|
| iOS 16.4 or later | Earlier versions have no web push at all |
| **Added to the Home Screen** | The same URL in a Safari tab gets no push, ever |
| Opened from the **icon** | Launching from Safari puts you back in tab context |
| Permission from a tap | A prompt on page load is ignored by the OS |
| HTTPS | Service workers only run on secure origins |

The home-screen rule is the one that catches people. The Alerts screen detects
it and tells you what to do rather than failing silently.

## Getting it running

### 1. Deploy the app

```sh
cd web
npm install
npx wrangler login          # opens a browser; your Cloudflare account
npm run deploy              # builds and pushes to Cloudflare Pages
```

Wrangler prints a URL like `https://bunts.pages.dev`. That's the app.

### 2. Install it on the iPhone

1. Open the URL in **Safari** (not Chrome — iOS only installs PWAs from Safari)
2. Share button → **Add to Home Screen**
3. Open Bunts from the new icon on your home screen

### 3. Subscribe

Alerts tab → **Enable alerts** → accept the permission prompt.

With no backend deployed yet, the screen shows the push subscription and a
Copy button. Paste it into the chat and a test notification gets sent straight
to the phone:

```sh
cd tools && npm install
node send-test-push.js '<subscription JSON>'
```

If it lands on your lock screen, the path is proven end to end.

### 4. Point the app at the backend

Once the Worker is deployed, put its URL in `web/.env.local`:

```
VITE_BUNTS_API=https://bunts-backend.<subdomain>.workers.dev
VITE_BUNTS_SECRET=<the APP_SECRET you set with wrangler secret put>
```

Redeploy. Subscriptions then register with the Worker automatically and alerts
come from the lineup poller instead of by hand.

## VAPID keys

Generated already and stored in the repo-root `.env`, which is gitignored:

- `VAPID_PUBLIC_KEY` — safe to ship in the client; the browser needs it to subscribe
- `VAPID_PRIVATE_KEY` — **secret**. Goes into the Worker via `wrangler secret put VAPID_PRIVATE_KEY`, never into the repo
- `VAPID_SUBJECT` — a mailto: that push services can contact

Rotating these invalidates every existing subscription, so don't, unless the
private key leaks.

## When a notification doesn't arrive

- **Nothing happens and there's no error** — you're in a Safari tab. Open from
  the home-screen icon.
- **410 or 404 from the push service** — the subscription expired. Re-enable
  alerts in the app to get a fresh one.
- **Permission granted but silent** — check a Focus mode isn't filtering it, and
  Settings → Notifications → Bunts.
- **Works on desktop, not iPhone** — almost always the home-screen rule again.

## If web push disappoints

The Expo project is still in `mobile/` and shares the types and backend. Going
native is a UI port, not a restart. It costs $99/year for the Apple Developer
Program, needs an EAS development build with APNs credentials, and device
registration before the first build — but push is more reliable and the app
runs standalone without the home-screen dance.

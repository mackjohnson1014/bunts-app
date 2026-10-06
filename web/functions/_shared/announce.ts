/**
 * "Bunts 2.4 is out": one push per new changelog version, to everyone.
 *
 * The Functions bundle carries the changelog (it's the same file the app
 * renders), so whatever was just deployed knows its own version. The first
 * time anyone opens the app after a deploy, this notices the version differs
 * from the last one announced, records the new one, and pushes. A deploy that
 * doesn't add a changelog release announces nothing -- there'd be nothing to
 * show -- though the in-app "new version" pill still appears for it.
 *
 * Called from GET /me only (once per app launch), not every request: KV has
 * no compare-and-set, so a launch's parallel requests racing here would each
 * see the old version and push. The in-memory flag covers the same isolate.
 */
import { APP_VERSION, RELEASES } from '../../src/changelog';
import { notify, type PushEnv } from './push';

const KEY = 'announced:version';
let announcedHere: string | null = null;

export async function announceIfNew(env: PushEnv): Promise<void> {
  if (announcedHere === APP_VERSION) return;
  announcedHere = APP_VERSION;
  const last = await env.BUNTS.get(KEY);
  if (last === APP_VERSION) return;
  await env.BUNTS.put(KEY, APP_VERSION);

  const release = RELEASES[0];
  await notify(
    env,
    {
      title: `Bunts ${APP_VERSION} is out`,
      body: `${release.title} — tap to see what’s new.`,
      tag: 'update',
      url: `/#settings/changelog/${APP_VERSION}`,
      data: { type: 'update', version: APP_VERSION },
    },
    { kind: 'updates' },
  );
}

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildId = new Date().toISOString();

/**
 * Emit the build id as a tiny file the running app can poll. An installed iOS
 * app stays suspended in memory for days, so it will happily keep running code
 * from last week unless something tells it otherwise.
 */
function versionFile() {
  return {
    name: 'bunts-version-file',
    closeBundle() {
      writeFileSync(join('dist', 'version.json'), JSON.stringify({ buildId }) + '\n');
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  server: { host: true },   // so the phone on the same wifi can reach the dev server
});

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUNTS_API?: string;
  readonly VITE_BUNTS_SECRET?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

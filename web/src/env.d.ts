/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_USE_MOCKS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

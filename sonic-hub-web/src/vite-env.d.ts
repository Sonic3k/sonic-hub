/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FOOTBALL_URL?: string;
  readonly VITE_MYSTIC_URL?: string;
  readonly VITE_PAGES_URL?: string;
  readonly VITE_PALACE_URL?: string;
  readonly VITE_WORLD_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

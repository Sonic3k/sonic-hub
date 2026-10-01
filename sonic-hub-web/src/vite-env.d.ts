/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FOOTBALL_URL?: string;
  readonly VITE_PAGES_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

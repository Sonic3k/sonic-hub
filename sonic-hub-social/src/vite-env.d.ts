/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Sonic Hub (web), linked from the strip on top */
  readonly VITE_HUB_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

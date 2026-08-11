/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MSAL_CLIENT_ID: string
  readonly VITE_MSAL_TENANT_ID: string
  readonly VITE_SHAREPOINT_SITE_HOST: string
  readonly VITE_SHAREPOINT_SITE_PATH: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_SHARED_MODE?: string
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

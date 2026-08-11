import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  type Configuration,
} from '@azure/msal-browser'

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || ''
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'common'

export const isMsalConfigured = Boolean(clientId && clientId !== '00000000-0000-0000-0000-000000000000')

const msalConfig: Configuration = {
  auth: {
    clientId: clientId || '00000000-0000-0000-0000-000000000000',
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined,
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
}

export const loginRequest = {
  scopes: ['User.Read', 'Sites.ReadWrite.All', 'Files.ReadWrite.All'],
}

export const msalInstance = new PublicClientApplication(msalConfig)

let initPromise: Promise<void> | null = null

export function ensureMsal(): Promise<void> {
  if (!initPromise) {
    initPromise = msalInstance.initialize().then(async () => {
      const result = await msalInstance.handleRedirectPromise()
      if (result?.account) {
        msalInstance.setActiveAccount(result.account)
      } else {
        const accounts = msalInstance.getAllAccounts()
        if (accounts[0]) msalInstance.setActiveAccount(accounts[0])
      }
    })
  }
  return initPromise
}

export function getActiveAccount(): AccountInfo | null {
  return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null
}

export async function signIn(): Promise<AccountInfo> {
  await ensureMsal()
  const result = await msalInstance.loginPopup(loginRequest)
  msalInstance.setActiveAccount(result.account)
  return result.account
}

export async function signOut(): Promise<void> {
  await ensureMsal()
  const account = getActiveAccount()
  if (account) {
    await msalInstance.logoutPopup({ account })
  }
}

export async function getAccessToken(): Promise<string> {
  await ensureMsal()
  const account = getActiveAccount()
  if (!account) throw new Error('Not signed in')

  try {
    const silent: AuthenticationResult = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    })
    return silent.accessToken
  } catch {
    const popup = await msalInstance.acquireTokenPopup(loginRequest)
    msalInstance.setActiveAccount(popup.account)
    return popup.accessToken
  }
}

export function isCorporateEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return lower.endsWith('@csgi.com') || lower.endsWith('@csg.com')
}

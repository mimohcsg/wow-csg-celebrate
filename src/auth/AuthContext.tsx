import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ensureMsal, getActiveAccount, isCorporateEmail, isMsalConfigured, signIn, signOut } from './msal'
import { getMe } from '../api/sharepoint'
import { getDemoUser, isDemoMode } from '../api/demoStore'
import type { CelebrateUser } from '../types'

const DEMO_SESSION_KEY = 'wow-celebrate-demo-session'

type AuthState = {
  user: CelebrateUser | null
  loading: boolean
  configured: boolean
  demoMode: boolean
  login: () => Promise<void>
  loginDemo: () => Promise<void>
  logout: () => Promise<void>
  error: string
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CelebrateUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const demoMode = isDemoMode()

  const hydrate = useCallback(async () => {
    if (demoMode) {
      if (localStorage.getItem(DEMO_SESSION_KEY) === '1') {
        setUser(getDemoUser())
      } else {
        setUser(null)
      }
      setLoading(false)
      return
    }
    if (!isMsalConfigured) {
      setLoading(false)
      return
    }
    await ensureMsal()
    const account = getActiveAccount()
    if (!account) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await getMe()
      if (!isCorporateEmail(me.email)) {
        await signOut()
        setUser(null)
        setError('Use your @csgi.com or @csg.com work account')
      } else {
        setUser(me)
        setError('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: demoMode || isMsalConfigured,
      demoMode,
      error,
      login: async () => {
        if (demoMode) {
          localStorage.setItem(DEMO_SESSION_KEY, '1')
          setUser(getDemoUser())
          setError('')
          return
        }
        setError('')
        setLoading(true)
        try {
          await signIn()
          await hydrate()
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Sign-in failed')
          setLoading(false)
        }
      },
      loginDemo: async () => {
        localStorage.setItem(DEMO_SESSION_KEY, '1')
        setUser(getDemoUser())
        setError('')
      },
      logout: async () => {
        localStorage.removeItem(DEMO_SESSION_KEY)
        if (!demoMode && isMsalConfigured) await signOut()
        setUser(null)
      },
    }),
    [user, loading, error, hydrate, demoMode],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}

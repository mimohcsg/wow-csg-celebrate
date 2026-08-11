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
import { isSharedMode } from '../api/sharedApi'
import type { CelebrateUser } from '../types'

const PROFILE_KEY = 'wow-celebrate-profile-v1'

type AuthState = {
  user: CelebrateUser | null
  loading: boolean
  configured: boolean
  demoMode: boolean
  sharedMode: boolean
  login: () => Promise<void>
  joinShared: (name: string, email: string) => Promise<void>
  logout: () => Promise<void>
  error: string
}

const Ctx = createContext<AuthState | null>(null)

function readProfile(): CelebrateUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CelebrateUser
    if (parsed?.email && parsed?.displayName) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function writeProfile(user: CelebrateUser) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CelebrateUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const demoMode = isDemoMode() && !isSharedMode()
  const sharedMode = isSharedMode()

  const hydrate = useCallback(async () => {
    if (sharedMode) {
      setUser(readProfile())
      setLoading(false)
      return
    }
    if (demoMode) {
      if (localStorage.getItem(PROFILE_KEY) === 'demo') {
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
  }, [demoMode, sharedMode])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: sharedMode || demoMode || isMsalConfigured,
      demoMode,
      sharedMode,
      error,
      login: async () => {
        if (sharedMode) return
        if (demoMode) {
          localStorage.setItem(PROFILE_KEY, 'demo')
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
      joinShared: async (name: string, email: string) => {
        const displayName = name.trim()
        const cleanEmail = email.trim().toLowerCase()
        if (!displayName || !cleanEmail || !cleanEmail.includes('@')) {
          setError('Enter your name and a valid work email')
          return
        }
        const next: CelebrateUser = {
          id: cleanEmail,
          email: cleanEmail,
          displayName,
          avatarUrl: '',
        }
        writeProfile(next)
        setUser(next)
        setError('')
      },
      logout: async () => {
        localStorage.removeItem(PROFILE_KEY)
        if (!sharedMode && !demoMode && isMsalConfigured) await signOut()
        setUser(null)
      },
    }),
    [user, loading, error, hydrate, demoMode, sharedMode],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}

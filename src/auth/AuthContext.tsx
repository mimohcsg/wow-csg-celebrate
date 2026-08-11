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
import { isSharedMode, sharedLogin, sharedSignup, sharedUpdateProfile } from '../api/sharedApi'
import type { CelebrateUser } from '../types'

const PROFILE_KEY = 'wow-celebrate-profile-v2'

type AuthState = {
  user: CelebrateUser | null
  loading: boolean
  configured: boolean
  demoMode: boolean
  sharedMode: boolean
  login: () => Promise<void>
  loginShared: (login: string, password: string) => Promise<void>
  signupShared: (params: {
    username: string
    email: string
    password: string
    displayName: string
    bio?: string
  }) => Promise<void>
  updateProfile: (params: { displayName?: string; bio?: string; avatar?: File | null }) => Promise<void>
  joinShared: (name: string, email: string) => Promise<void>
  logout: () => Promise<void>
  error: string
  setError: (msg: string) => void
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
      setError,
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
      loginShared: async (loginId, password) => {
        setError('')
        setLoading(true)
        try {
          const next = await sharedLogin(loginId, password)
          writeProfile(next)
          setUser(next)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Login failed')
          throw e
        } finally {
          setLoading(false)
        }
      },
      signupShared: async (params) => {
        setError('')
        setLoading(true)
        try {
          const next = await sharedSignup(params)
          writeProfile(next)
          setUser(next)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Signup failed')
          throw e
        } finally {
          setLoading(false)
        }
      },
      updateProfile: async (params) => {
        if (!user) return
        const next = await sharedUpdateProfile({
          email: user.email,
          displayName: params.displayName,
          bio: params.bio,
          avatar: params.avatar,
        })
        writeProfile(next)
        setUser(next)
      },
      joinShared: async (name: string, email: string) => {
        // Legacy quick-join kept for compatibility
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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Alert, Box, Button, CircularProgress, Container } from '@mui/material'
import { ApiError, apiFetch, refreshCsrfToken, setUnauthorizedHandler } from '../api/client'
import { AuthContext, type AuthContextValue, type RegisterInput, type User } from './AuthContext'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

async function fetchCurrentUser(signal: AbortSignal) {
  try {
    return await apiFetch<User>('/api/auth/me', { signal })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [cookiesBlocked, setCookiesBlocked] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  // Lets the unauthorized handler see the current user without re-registering on every change.
  const userRef = useRef<User | null>(null)

  const applyUser = useCallback((next: User | null) => {
    userRef.current = next
    setUser(next)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([refreshCsrfToken(controller.signal), fetchCurrentUser(controller.signal)])
      .then(([csrfCookieStored, currentUser]) => {
        setCookiesBlocked(!csrfCookieStored || !navigator.cookieEnabled)
        applyUser(currentUser)
        setLoad({ status: 'ready' })
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Request failed.' })
        }
      })

    return () => controller.abort()
  }, [applyUser, loadAttempt])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!userRef.current) return
      applyUser(null)
      setSessionExpired(true)
      // The old token was tied to the expired session; later sign-in needs an anonymous one.
      refreshCsrfToken().catch(() => {})
    })
    return () => setUnauthorizedHandler(null)
  }, [applyUser])

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await apiFetch<User>('/api/auth/login', { method: 'POST', body: { email, password } })
      // CSRF tokens are tied to the signed-in user, so get one for the new session.
      await refreshCsrfToken().catch(() => {})
      setSessionExpired(false)
      applyUser(me)
    },
    [applyUser],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      await apiFetch<void>('/api/auth/register', { method: 'POST', body: input })
      try {
        await login(input.email, input.password)
      } catch {
        throw new ApiError(0, "Your account was created, but signing in failed. Please sign in to continue.")
      }
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      // A 401 means the session had already ended, which is the outcome we wanted.
      if (!(err instanceof ApiError && err.status === 401)) throw err
    }
    await refreshCsrfToken().catch(() => {})
    applyUser(null)
  }, [applyUser])

  const value = useMemo<AuthContextValue>(
    () => ({ user, cookiesBlocked, sessionExpired, login, register, logout }),
    [user, cookiesBlocked, sessionExpired, login, register, logout],
  )

  if (load.status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    )
  }

  if (load.status === 'error') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setLoad({ status: 'loading' })
                setLoadAttempt((attempt) => attempt + 1)
              }}
            >
              Retry
            </Button>
          }
        >
          Couldn't load the app: {load.message}
        </Alert>
      </Container>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import type { RedirectState } from './redirect'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, signedOut } = useAuth()
  const location = useLocation()

  if (!user) {
    // After a deliberate sign-out the next person to sign in may be someone else,
    // so they start at the home page instead of the page the previous user was on.
    const state: RedirectState = signedOut ? null : { from: location }
    return <Navigate to="/login" replace state={state} />
  }

  return children
}

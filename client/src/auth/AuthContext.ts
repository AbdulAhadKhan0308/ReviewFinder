import { createContext, useContext } from 'react'

export type Role = 'Reviewer' | 'Owner'

export type User = { id: string; email: string; displayName: string; role: Role }

export type RegisterInput = { email: string; password: string; displayName: string; role: Role }

export type AuthContextValue = {
  user: User | null
  // True when the browser refused the CSRF cookie, which means sign-in can't work either.
  cookiesBlocked: boolean
  // True when the user was signed out because the server no longer accepted their session.
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export const roleLabels: Record<Role, string> = {
  Reviewer: 'Reviewer',
  Owner: 'Restaurant owner',
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}

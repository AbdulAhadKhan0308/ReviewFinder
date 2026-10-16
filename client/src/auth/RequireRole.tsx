import type { ReactNode } from 'react'
import NotFoundPage from '../pages/NotFoundPage'
import { useAuth, type Role } from './AuthContext'

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === role ? children : <NotFoundPage />
}

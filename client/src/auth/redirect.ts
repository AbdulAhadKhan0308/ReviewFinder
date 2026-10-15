import { useLocation, type Location } from 'react-router'

// Set by RequireAuth so sign-in can return the user to the page they were heading to.
export type RedirectState = { from?: Location } | null

export function useRedirectTarget() {
  const from = (useLocation().state as RedirectState)?.from
  return from ? `${from.pathname}${from.search}${from.hash}` : '/'
}

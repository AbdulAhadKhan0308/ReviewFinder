import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './client'

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T }

// Loads JSON from a GET endpoint, reloading whenever the path changes.
// A request that is replaced or no longer needed is cancelled, and its result ignored.
export function useApiQuery<T>(path: string) {
  // The path is stored with the result so a result for an old path is never shown for a new one.
  const [result, setResult] = useState<{ path: string; attempt: number; state: QueryState<T> } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<T>(path, { signal: controller.signal })
      .then((data) => setResult({ path, attempt, state: { status: 'success', data } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ path, attempt, state: { status: 'error', error } })
      })

    return () => controller.abort()
  }, [path, attempt])

  const reload = useCallback(() => setAttempt((a) => a + 1), [])

  const isCurrent = result !== null && result.path === path && result.attempt === attempt
  const state: QueryState<T> = isCurrent ? result.state : { status: 'loading' }
  return { ...state, reload } as QueryState<T> & { reload: () => void }
}

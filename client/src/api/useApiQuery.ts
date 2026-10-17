import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './client'

export type QueryState<T> =
  // previous holds the last data loaded, if any, so a list can stay visible while its next page or filter loads.
  | { status: 'loading'; previous?: T }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T }

type SettledState<T> = Exclude<QueryState<T>, { status: 'loading' }>

// Loads JSON from a GET endpoint, reloading whenever the path changes.
// A request that is replaced or no longer needed is cancelled, and its result ignored.
export function useApiQuery<T>(path: string) {
  // The path is stored with the result so a result for an old path is never shown for a new one.
  const [result, setResult] = useState<{ path: string; attempt: number; state: SettledState<T> } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<T>(path, { signal: controller.signal })
      .then((data) => setResult({ path, attempt, state: { status: 'success', data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // A failed refresh keeps showing the data that's already loaded.
        setResult((current) =>
          current?.path === path && current.attempt === attempt && current.state.status === 'success'
            ? current
            : { path, attempt, state: { status: 'error', error } },
        )
      })

    return () => controller.abort()
  }, [path, attempt, refreshCount])

  // Starts over, showing the loading state; used by Retry buttons.
  const reload = useCallback(() => setAttempt((a) => a + 1), [])
  // Fetches again while still showing the current data, for example after the user changed it.
  const refresh = useCallback(() => setRefreshCount((c) => c + 1), [])

  const isCurrent = result !== null && result.path === path && result.attempt === attempt
  const previous = result?.state.status === 'success' ? result.state.data : undefined
  const state: QueryState<T> = isCurrent ? result.state : { status: 'loading', previous }
  return { ...state, reload, refresh } as QueryState<T> & { reload: () => void; refresh: () => void }
}

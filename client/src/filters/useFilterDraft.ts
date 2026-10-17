import { useCallback, useEffect, useRef, useState } from 'react'

const typingDelayMs = 400

type Options<T> = {
  // The filters currently applied, read from the page URL.
  filters: T
  // Identifies a set of filters; two sets with the same key are the same filters.
  keyOf: (filters: T) => string
  onChange: (filters: T) => void
  // Turns the inputs' values into filters that can be applied, for example by keeping the last
  // valid value of a field that currently holds an invalid one.
  toApplied?: (draft: T, applied: T) => T
}

// Filter inputs show a local draft that updates instantly, while the applied filters live in the URL and
// update a moment later; binding inputs to the URL directly would briefly reset a value being changed.
// Changes made elsewhere, such as Back or a Clear filters button outside the bar, replace the draft.
export function useFilterDraft<T>({ filters, keyOf, onChange, toApplied = (draft) => draft }: Options<T>) {
  const [draft, setDraft] = useState(filters)
  const [seenKey, setSeenKey] = useState(() => keyOf(filters))
  const [appliedKey, setAppliedKey] = useState(() => keyOf(filters))
  const filtersKey = keyOf(filters)
  if (filtersKey !== seenKey) {
    setSeenKey(filtersKey)
    if (filtersKey !== appliedKey) {
      setDraft(filters)
      setAppliedKey(filtersKey)
    }
  }

  const latest = useRef({ draft, filters, keyOf, onChange, toApplied })
  useEffect(() => {
    latest.current = { draft, filters, keyOf, onChange, toApplied }
  })

  const apply = useCallback((next: T) => {
    const { filters, keyOf, onChange, toApplied } = latest.current
    const applied = toApplied(next, filters)
    const key = keyOf(applied)
    setAppliedKey(key)
    if (key !== keyOf(filters)) onChange(applied)
  }, [])

  // Typed text is applied once typing pauses, instead of on every keystroke.
  const draftKey = keyOf(draft)
  useEffect(() => {
    const timer = setTimeout(() => apply(latest.current.draft), typingDelayMs)
    return () => clearTimeout(timer)
  }, [draftKey, apply])

  // For text fields: applied after a pause.
  const updateLater = useCallback((next: T) => setDraft(next), [])

  // For selects, dates and buttons: applied straight away.
  const updateNow = useCallback(
    (next: T) => {
      setDraft(next)
      apply(next)
    },
    [apply],
  )

  return { draft, updateLater, updateNow }
}

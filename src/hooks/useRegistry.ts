import { useState, useEffect } from 'react'
import type { DeckListEntry } from 'shared/types'
import { deckRegistry, fetchRuntimeRegistry } from '../core/deckRegistry'

interface RegistryState {
  entries: DeckListEntry[]
  loading: boolean
}

function isCliMode(): boolean {
  return document.querySelector('meta[name="dekk-mode"]')?.getAttribute('content') === 'cli'
}

export function useRegistry(): RegistryState {
  const [state, setState] = useState<RegistryState>(() => {
    if (!isCliMode()) {
      return { entries: deckRegistry, loading: false }
    }
    return { entries: [], loading: true }
  })

  useEffect(() => {
    if (!isCliMode()) return

    let cancelled = false
    fetchRuntimeRegistry().then((result) => {
      if (cancelled) return
      if (result) {
        setState({ entries: result, loading: false })
      } else {
        // Fallback to build-time registry
        setState({ entries: deckRegistry, loading: false })
      }
    })

    return () => { cancelled = true }
  }, [])

  return state
}

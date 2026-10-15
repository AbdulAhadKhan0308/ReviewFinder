import { useEffect, useState } from 'react'
import { Alert, Box, Chip, CircularProgress, Typography } from '@mui/material'
import { apiFetch } from '../api/client'

type Cuisine = { id: string; name: string }

export default function HomePage() {
  const [cuisines, setCuisines] = useState<Cuisine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<Cuisine[]>('/api/cuisines', { signal: controller.signal })
      .then(setCuisines)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Request failed')
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Cuisines
      </Typography>

      {error && <Alert severity="error">Couldn't load cuisines: {error}</Alert>}

      {!error && !cuisines && <CircularProgress aria-label="Loading cuisines" />}

      {cuisines && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {cuisines.map((cuisine) => (
            <Chip key={cuisine.id} label={cuisine.name} />
          ))}
        </Box>
      )}
    </>
  )
}

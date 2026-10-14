import { useEffect, useState } from 'react'
import { Alert, Box, Chip, CircularProgress, Container, Typography } from '@mui/material'

type Cuisine = { id: string; name: string }

export default function App() {
  const [cuisines, setCuisines] = useState<Cuisine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/cuisines', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        return response.json() as Promise<Cuisine[]>
      })
      .then(setCuisines)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Request failed')
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Restaurant Reviews
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
    </Container>
  )
}

import { Link as RouterLink } from 'react-router'
import { Button, Container, Typography } from '@mui/material'

export default function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The page you're looking for doesn't exist.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to the home page
      </Button>
    </Container>
  )
}

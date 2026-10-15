import type { ReactNode } from 'react'
import { Alert, Container, Paper, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext'

export function AuthPageLayout({ title, children }: { title: string; children: ReactNode }) {
  const { cookiesBlocked } = useAuth()

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, sm: 8 } }}>
      <Typography variant="h6" component="p" align="center" color="text.secondary" sx={{ mb: 2 }}>
        Restaurant Reviews
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
          {title}
        </Typography>
        {cookiesBlocked && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Signing in needs cookies. Allow cookies for this site in your browser settings, then reload the page.
          </Alert>
        )}
        {children}
      </Paper>
    </Container>
  )
}

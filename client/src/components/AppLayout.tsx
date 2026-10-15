import { useState } from 'react'
import { Link as RouterLink, Outlet } from 'react-router'
import { Alert, AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { roleLabels, useAuth } from '../auth/AuthContext'

export function AppLayout() {
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      await logout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing out failed. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            Restaurant Reviews
          </Typography>
          {user && (
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2">{user.displayName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {roleLabels[user.role]}
              </Typography>
            </Box>
          )}
          <Button variant="outlined" onClick={handleSignOut} loading={signingOut}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Outlet />
      </Container>
    </>
  )
}

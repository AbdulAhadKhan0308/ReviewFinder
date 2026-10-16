import { useState, type FormEvent } from 'react'
import { Link as RouterLink, Navigate, useLocation } from 'react-router'
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import { useRedirectTarget } from '../auth/redirect'
import { toFormErrors, type FormErrors } from '../api/formErrors'
import { AuthPageLayout } from '../components/AuthPageLayout'

const fields = ['email', 'password'] as const
type Field = (typeof fields)[number]

export default function LoginPage() {
  const { user, login, cookiesBlocked, sessionExpired } = useAuth()
  const redirectTo = useRedirectTarget()
  // Passed along to the other auth page so the original destination survives switching pages.
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors<Field>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={redirectTo} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors<Field> = {
      email: email.trim() ? undefined : 'Enter your email address.',
      password: password ? undefined : 'Enter your password.',
    }
    setErrors(nextErrors)
    setFormError(null)
    if (nextErrors.email || nextErrors.password) return

    setSubmitting(true)
    try {
      // On success the user is set and this page redirects.
      await login(email.trim(), password)
    } catch (err) {
      const result = toFormErrors(err, fields)
      setErrors(result.fieldErrors)
      setFormError(result.formError)
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout title="Sign in">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {sessionExpired && !formError && <Alert severity="info">Your session has ended. Please sign in again.</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password}
          />
          <Button type="submit" variant="contained" size="large" loading={submitting} disabled={cookiesBlocked}>
            Sign in
          </Button>
          <Typography variant="body2" align="center">
            New here?{' '}
            <Link component={RouterLink} to="/register" state={location.state}>
              Create an account
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthPageLayout>
  )
}

import { useState, type FormEvent } from 'react'
import { Link as RouterLink, Navigate, useLocation } from 'react-router'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { toFormErrors, type FormErrors } from '../api/formErrors'
import { roleLabels, useAuth, type Role } from '../auth/AuthContext'
import { useRedirectTarget } from '../auth/redirect'
import { limits, validateDisplayName, validateEmail, validateNewPassword } from '../auth/validation'
import { AuthPageLayout } from '../components/AuthPageLayout'

const fields = ['email', 'displayName', 'password', 'role'] as const
type Field = (typeof fields)[number]

const roleDescriptions: Record<Role, string> = {
  Reviewer: 'Browse restaurants and write reviews.',
  Owner: 'List and manage your restaurants.',
}

export default function RegisterPage() {
  const { user, register, cookiesBlocked } = useAuth()
  const redirectTo = useRedirectTarget()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [errors, setErrors] = useState<FormErrors<Field>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={redirectTo} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors<Field> = {
      email: validateEmail(email),
      displayName: validateDisplayName(displayName),
      password: validateNewPassword(password),
      role: role ? undefined : 'Choose how you will use Restaurant Reviews.',
    }
    setErrors(nextErrors)
    setFormError(null)
    if (Object.values(nextErrors).some(Boolean) || !role) return

    setSubmitting(true)
    try {
      // Registering also signs the user in, after which this page redirects.
      await register({ email: email.trim(), displayName: displayName.trim(), password, role })
    } catch (err) {
      const result = toFormErrors(err, fields)
      setErrors(result.fieldErrors)
      setFormError(result.formError)
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout title="Create an account">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
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
            label="Display name"
            autoComplete="nickname"
            fullWidth
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={Boolean(errors.displayName)}
            helperText={errors.displayName ?? 'Shown next to your reviews.'}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password ?? `${limits.passwordMin} to ${limits.passwordMax} characters.`}
          />
          <FormControl error={Boolean(errors.role)}>
            <FormLabel id="role-label">I want to</FormLabel>
            <RadioGroup aria-labelledby="role-label" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.keys(roleLabels) as Role[]).map((value) => (
                <FormControlLabel
                  key={value}
                  value={value}
                  control={<Radio />}
                  label={
                    <span>
                      <strong>{roleLabels[value]}</strong>: {roleDescriptions[value]}
                    </span>
                  }
                />
              ))}
            </RadioGroup>
            <FormHelperText>{errors.role ?? "You can't change this later."}</FormHelperText>
          </FormControl>
          <Button type="submit" variant="contained" size="large" loading={submitting} disabled={cookiesBlocked}>
            Create account
          </Button>
          <Typography variant="body2" align="center">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" state={location.state}>
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthPageLayout>
  )
}

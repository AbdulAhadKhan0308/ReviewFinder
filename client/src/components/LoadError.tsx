import { Alert, Button } from '@mui/material'

export function LoadError({ message, error, onRetry }: { message: string; error: unknown; onRetry: () => void }) {
  const reason = error instanceof Error ? error.message : 'Request failed.'
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {message} {reason}
    </Alert>
  )
}

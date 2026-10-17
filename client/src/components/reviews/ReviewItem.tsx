import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Rating,
  Stack,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { isNotFound } from '../../api/client'
import { deleteReview, updateReview, type Review } from '../../api/reviews'
import { formatDate } from '../../restaurants/format'
import { ReviewForm } from './ReviewForm'

type Props = {
  review: Review
  // Called after this review is changed or deleted, with a message to show.
  onChanged: (message: string) => void
}

export function ReviewItem({ review, onChanged }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const edited = review.updatedAt !== review.createdAt

  return (
    <Box component="li" sx={{ py: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Rating value={review.rating} readOnly size="small" />
          <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
            {review.authorDisplayName}
            {review.isMine && ' (you)'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(review.createdAt)}
            {edited && ` · Edited ${formatDate(review.updatedAt)}`}
          </Typography>
        </Box>
        {review.isMine && !editing && (
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="small" color="error" startIcon={<DeleteOutlinedIcon />} onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          </Stack>
        )}
      </Stack>

      {editing ? (
        <Box sx={{ mt: 2 }}>
          <ReviewForm
            initial={review}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await updateReview(review.id, input)
              setEditing(false)
              onChanged('Your review was updated.')
            }}
          />
        </Box>
      ) : (
        review.text && (
          <Typography sx={{ mt: 1, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{review.text}</Typography>
        )
      )}

      {confirmingDelete && (
        <DeleteReviewDialog
          review={review}
          onClose={() => setConfirmingDelete(false)}
          onDeleted={() => onChanged('Your review was deleted.')}
        />
      )}
    </Box>
  )
}

function DeleteReviewDialog({ review, onClose, onDeleted }: { review: Review; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteReview(review.id)
    } catch (err) {
      // Already gone counts as deleted.
      if (!isNotFound(err)) {
        setError(err instanceof Error ? err.message : 'Deleting failed. Please try again.')
        setDeleting(false)
        return
      }
    }
    onDeleted()
  }

  return (
    <Dialog open onClose={deleting ? undefined : onClose} aria-labelledby={`delete-review-${review.id}`}>
      <DialogTitle id={`delete-review-${review.id}`}>Delete your review?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <DialogContentText>Your review will be permanently deleted. This can't be undone.</DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={handleDelete} loading={deleting}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}

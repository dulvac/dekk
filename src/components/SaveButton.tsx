import styles from '../styles/editor.module.css'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'pr-created'

export interface SaveButtonProps {
  status: SaveStatus
  onSave: () => void
  errorMessage?: string
  prUrl?: string
}

export function SaveButton({ status, onSave, errorMessage, prUrl }: SaveButtonProps) {
  if (status === 'saved') {
    return <span className={styles.savedIndicator}>Saved!</span>
  }

  if (status === 'error') {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorText}>Error: {errorMessage || 'Failed to save'}</span>
      </div>
    )
  }

  if (status === 'pr-created' && prUrl) {
    return (
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.prLink}
        aria-label="View pull request"
      >
        View Pull Request
      </a>
    )
  }

  return (
    <button
      className={styles.saveBtn}
      onClick={onSave}
      disabled={status === 'saving'}
      aria-label={status === 'saving' ? 'Saving...' : 'Save'}
    >
      {status === 'saving' ? 'Saving...' : 'Save'}
    </button>
  )
}

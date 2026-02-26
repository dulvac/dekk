import { useState } from 'react'
import styles from '../styles/modal.module.css'

export interface GitHubAuthModalProps {
  onAuthorize: (token: string, storage: 'session' | 'local') => void
  onCancel: () => void
}

export function GitHubAuthModal({ onAuthorize, onCancel }: GitHubAuthModalProps) {
  const [token, setToken] = useState('')
  const [remember, setRemember] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const isValidToken = token.startsWith('ghp_') || token.startsWith('github_pat_')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidToken) {
      onAuthorize(token, remember ? 'local' : 'session')
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>GitHub Authentication</h2>
        <p className={styles.modalDescription}>
          To save your changes to GitHub, you need a Personal Access Token with <code>repo</code>{' '}
          permissions.
        </p>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="github-token" className={styles.label}>
              GitHub Token
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="github-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                autoComplete="off"
                spellCheck={false}
                className={styles.input}
                aria-label="GitHub Token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className={styles.revealBtn}
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className={styles.checkbox}
                aria-label="Remember token"
              />
              <span>Remember token</span>
            </label>
            <p className={styles.checkboxWarning}>
              Token will be stored in your browser's localStorage. Only use this on your personal
              device.
            </p>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidToken}
              className={styles.authorizeBtn}
              aria-label="Authorize"
            >
              Authorize
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

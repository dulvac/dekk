import styles from '../styles/navigation.module.css'

interface KeycapButtonProps {
  label: string
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}

export function KeycapButton({
  label,
  onClick,
  ariaLabel,
  disabled = false,
  className,
}: KeycapButtonProps) {
  return (
    <button
      className={`${styles.keycap} ${className ?? ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {label}
    </button>
  )
}

import type { DeckEntry } from '../core/deckRegistry'
import styles from '../styles/picker.module.css'

interface PickerViewProps {
  entries: DeckEntry[]
  onSelectDeck: (deckId: string) => void
}

export function PickerView({ entries, onSelectDeck }: PickerViewProps) {
  return (
    <div className={styles.pickerView}>
      <header className={styles.header}>
        <h1 className={styles.logo}>dekk</h1>
      </header>
      <div className={styles.grid}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            className={styles.card}
            onClick={() => onSelectDeck(entry.id)}
            aria-label={`${entry.title} — ${entry.slideCount} slides`}
          >
            <span className={styles.cardTitle}>{entry.title}</span>
            {entry.author && (
              <span className={styles.cardAuthor}>{entry.author}</span>
            )}
            <span className={styles.cardMeta}>{entry.slideCount} slides</span>
          </button>
        ))}
      </div>
    </div>
  )
}

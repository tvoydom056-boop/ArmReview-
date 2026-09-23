import styles from './Notice.module.css'

// Служебная плашка — design/states.html «Голосовать нельзя». Разные причины выглядят по-разному:
// soon — обещание (жёлтый, часы), neutral — точка (замок). Цвет дублируется заголовком.
export function Notice({ tone, title, text }: { tone: 'soon' | 'neutral'; title: string; text: string }) {
  return (
    <div className={tone === 'soon' ? `${styles.notice} ${styles.soon}` : styles.notice}>
      <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        {tone === 'soon' ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </>
        ) : (
          <>
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </>
        )}
      </svg>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{text}</p>
      </div>
    </div>
  )
}

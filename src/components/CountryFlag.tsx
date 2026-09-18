import Image from 'next/image'

import styles from './CountryFlag.module.css'

// Флаги lipis/flag-icons (MIT) лежат локально в public/flags
export function CountryFlag({ code }: { code: string }) {
  const lower = code.toLowerCase()
  return (
    <Image
      className={styles.flag}
      src={`/flags/${lower}.svg`}
      alt={code.toUpperCase()}
      title={code.toUpperCase()}
      width={24}
      height={18}
      unoptimized
    />
  )
}

'use client'
import { useTranslations } from 'next-intl'
import styles from './Configurator.module.css'

type BulbType = 'warm' | 'cold' | 'none'

export function BulbPicker({ selected, onChange }: { selected: BulbType; onChange: (b: BulbType) => void }) {
  const t = useTranslations('configurator')
  const options: { id: BulbType; label: string }[] = [
    { id: 'warm', label: t('bulb_warm') },
    { id: 'cold', label: t('bulb_cold') },
    { id: 'none', label: t('bulb_none') },
  ]
  return (
    <div className={styles.bulbOptions}>
      {options.map(o => (
        <button
          key={o.id}
          className={[styles.bulbOption, selected === o.id ? styles.bulbSelected : ''].join(' ')}
          onClick={() => onChange(o.id)}
          aria-pressed={selected === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

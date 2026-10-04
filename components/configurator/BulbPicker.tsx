'use client'
import { useTranslations } from 'next-intl'
import styles from './Configurator.module.css'
import { BULB_TYPES, type BulbType } from './selection'
import { useRovingRadio } from './useRovingRadio'

export function BulbPicker({ selected, onChange }: { selected: BulbType; onChange: (b: BulbType) => void }) {
  const t = useTranslations('configurator')
  const roving = useRovingRadio(BULB_TYPES, selected, onChange)
  return (
    <div className={styles.bulbOptions} role="radiogroup" aria-label={t('pick_bulb')}>
      {BULB_TYPES.map((id, i) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={selected === id}
          className={[styles.bulbOption, selected === id ? styles.bulbSelected : ''].join(' ')}
          onClick={() => onChange(id)}
          {...roving(i)}
        >
          {t(`bulb_${id}`)}
        </button>
      ))}
    </div>
  )
}

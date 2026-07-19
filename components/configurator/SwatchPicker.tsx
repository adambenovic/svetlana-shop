'use client'
import styles from './Configurator.module.css'

interface SwatchItem {
  id: string
  name: string
  hex?: string
  swatch?: string
}

interface SwatchPickerProps {
  parts: SwatchItem[]
  selected: string
  onChange: (id: string) => void
  /** Accessible name for the group (e.g. the section label). */
  label?: string
}

export function SwatchPicker({ parts, selected, onChange, label }: SwatchPickerProps) {
  return (
    <div className={styles.swatches} role="radiogroup" aria-label={label}>
      {parts.map(p => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={selected === p.id}
          aria-label={p.name}
          className={[styles.swatch, selected === p.id ? styles.swatchSelected : ''].join(' ')}
          style={p.hex ? { background: p.hex } : p.swatch ? { backgroundImage: `url(${p.swatch})`, backgroundSize: 'cover' } : undefined}
          onClick={() => onChange(p.id)}
          title={p.name}
        />
      ))}
    </div>
  )
}

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
}

export function SwatchPicker({ parts, selected, onChange }: SwatchPickerProps) {
  return (
    <div className={styles.swatches}>
      {parts.map(p => (
        <button
          key={p.id}
          className={[styles.swatch, selected === p.id ? styles.swatchSelected : ''].join(' ')}
          style={p.hex ? { background: p.hex } : p.swatch ? { backgroundImage: `url(${p.swatch})`, backgroundSize: 'cover' } : undefined}
          onClick={() => onChange(p.id)}
          title={p.name}
          aria-pressed={selected === p.id}
        />
      ))}
    </div>
  )
}

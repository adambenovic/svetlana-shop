'use client'
import styles from './Configurator.module.css'
import { useRovingRadio } from './useRovingRadio'

interface SwatchItem {
  id: string
  /** Localized display name (accessible name + tooltip). */
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

/** 96×96 webp generated from the 1500×1500 swatch photo
 *  (public/assets/thumbs/<name>.webp) — the swatch renders at 36px. */
export function swatchThumb(swatch: string): string {
  return swatch.replace(/^\/assets\/([^/]+)\.(?:jpe?g|png|webp)$/i, '/assets/thumbs/$1.webp')
}

export function SwatchPicker({ parts, selected, onChange, label }: SwatchPickerProps) {
  const roving = useRovingRadio(parts.map(p => p.id), selected, onChange)

  return (
    <div className={styles.swatches} role="radiogroup" aria-label={label}>
      {parts.map((p, i) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={selected === p.id}
          aria-label={p.name}
          className={[styles.swatch, selected === p.id ? styles.swatchSelected : ''].join(' ')}
          style={p.hex ? { background: p.hex } : p.swatch ? { backgroundImage: `url(${swatchThumb(p.swatch)})`, backgroundSize: 'cover' } : undefined}
          onClick={() => onChange(p.id)}
          title={p.name}
          {...roving(i)}
        />
      ))}
    </div>
  )
}

'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import styles from './Configurator.module.css'
import type { ShapePart } from '@/types/parts'
import { useRovingRadio } from './useRovingRadio'

interface ShapeGridProps {
  parts: ShapePart[]
  selected: string
  onChange: (id: string) => void
  /** Localized display name of a part (e.g. "Base no. 3"). */
  nameOf: (part: ShapePart) => string
  /** Accessible name for the group (e.g. the section label). */
  label?: string
}

/** Cropped 168×168 thumbnail generated from the part's "-thumb" render
 *  (public/assets/thumbs/<id>.webp) — the full render is 1200×1600. */
function thumbSrc(thumbnail: string): string {
  return `/assets/thumbs/${thumbnail.replace(/-thumb\.webp$/, '.webp').replace(/ /g, '%20')}`
}

function partNumber(p: ShapePart): number {
  const n = parseInt(p.name, 10)
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}

export function ShapeGrid({ parts, selected, onChange, nameOf, label }: ShapeGridProps) {
  const t = useTranslations('a11y')
  const sorted = [...parts].sort((a, b) => partNumber(a) - partNumber(b))
  const roving = useRovingRadio(sorted.map(p => p.id), selected, onChange)

  return (
    <div className={styles.shapeGrid} role="radiogroup" aria-label={label}>
      {sorted.map((p, i) => {
        const name = t('shape_option', {
          name: nameOf(p),
          height: p.height_mm,
          diameter: p.diameter_mm,
        })
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected === p.id}
            aria-label={name}
            className={[styles.shapeOption, selected === p.id ? styles.shapeSelected : ''].join(' ')}
            onClick={() => onChange(p.id)}
            title={name}
            {...roving(i)}
          >
            {p.thumbnail && (
              <Image
                src={thumbSrc(p.thumbnail)}
                alt=""
                width={56}
                height={56}
                sizes="56px"
                className={styles.shapeThumb}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

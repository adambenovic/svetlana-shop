'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import styles from './Configurator.module.css'
import type { ShapePart } from '@/types/parts'

interface ShapeGridProps {
  parts: ShapePart[]
  selected: string
  onChange: (id: string) => void
  /** Accessible name for the group (e.g. the section label). */
  label?: string
}

export function ShapeGrid({ parts, selected, onChange, label }: ShapeGridProps) {
  const t = useTranslations('a11y')
  const sorted = [...parts].sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10))

  return (
    <div className={styles.shapeGrid} role="radiogroup" aria-label={label}>
      {sorted.map(p => {
        const name = t('shape_option', {
          name: p.name,
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
          >
            {p.thumbnail && (
              <Image
                src={`/assets/${p.thumbnail.replace(/ /g, '%20')}`}
                alt=""
                width={56}
                height={56}
                className={styles.shapeThumb}
                unoptimized
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

'use client'
import Image from 'next/image'
import styles from './Configurator.module.css'
import type { ShapePart } from '@/types/parts'

interface ShapeGridProps {
  parts: ShapePart[]
  selected: string
  onChange: (id: string) => void
}

export function ShapeGrid({ parts, selected, onChange }: ShapeGridProps) {
  return (
    <div className={styles.shapeGrid}>
      {parts.map(p => (
        <button
          key={p.id}
          className={[styles.shapeOption, selected === p.id ? styles.shapeSelected : ''].join(' ')}
          onClick={() => onChange(p.id)}
          title={`${p.id} (${p.height_mm}mm × ${p.diameter_mm}mm)`}
          aria-pressed={selected === p.id}
        >
          {p.thumbnail && (
            <Image
              src={`/assets/${p.thumbnail}`}
              alt={p.name}
              width={56}
              height={56}
              className={styles.shapeThumb}
              unoptimized
            />
          )}
          <span className={styles.shapeName}>{p.name}</span>
        </button>
      ))}
    </div>
  )
}

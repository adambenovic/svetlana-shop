'use client'
import { useEffect, useState } from 'react'
import styles from './QtyInput.module.css'

/** Quantity stepper with a directly editable number field.
 *  "−" is disabled at 1 so a stray click can't silently drop the item —
 *  removal is only via the explicit Remove button. */
export function QtyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])

  function apply(raw: string) {
    const n = parseInt(raw, 10)
    if (!Number.isNaN(n) && n >= 1) onChange(Math.min(n, 999))
  }

  return (
    <div className={styles.qty}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease">−</button>
      <input
        type="number"
        min={1}
        max={999}
        inputMode="numeric"
        value={text}
        onChange={e => { setText(e.target.value); apply(e.target.value) }}
        onBlur={e => { if (parseInt(e.target.value, 10) >= 1) apply(e.target.value); else setText(String(value)) }}
        aria-label="Quantity"
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase">+</button>
    </div>
  )
}

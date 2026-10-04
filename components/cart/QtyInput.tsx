'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import styles from './QtyInput.module.css'

/** Quantity stepper with a directly editable number field.
 *  "−" is disabled at 1 so a stray click can't silently drop the item —
 *  removal is only via the explicit Remove button. `label` (the item title)
 *  names the controls for screen readers when several lines are listed. */
export function QtyInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const t = useTranslations('a11y')
  const [text, setText] = useState(String(value))
  // Follow outside changes (e.g. the same line edited in the drawer) — adjust
  // during render rather than in an effect (no extra render pass).
  const [shown, setShown] = useState(value)
  if (shown !== value) { setShown(value); setText(String(value)) }

  function apply(raw: string) {
    const n = parseInt(raw, 10)
    if (!Number.isNaN(n) && n >= 1) onChange(Math.min(n, 999))
  }

  return (
    <div className={styles.qty}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t('qty_decrease', { item: label })}>−</button>
      <input
        type="number"
        min={1}
        max={999}
        inputMode="numeric"
        value={text}
        onChange={e => { setText(e.target.value); apply(e.target.value) }}
        onBlur={e => { if (parseInt(e.target.value, 10) >= 1) apply(e.target.value); else setText(String(value)) }}
        aria-label={t('qty_input', { item: label })}
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label={t('qty_increase', { item: label })}>+</button>
    </div>
  )
}

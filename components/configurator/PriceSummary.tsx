'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import type { PriceMap } from '@/store/currency'
import styles from './Configurator.module.css'

interface PriceSummaryProps {
  prices: PriceMap
  copied: boolean
  /** Configuration incomplete/unknown — adding to the cart is blocked. */
  disabled?: boolean
  onAddToCart: () => void
  onShare: () => void
}

export function PriceSummary({ prices, copied, disabled = false, onAddToCart, onShare }: PriceSummaryProps) {
  const t = useTranslations('configurator')
  const summaryRef = useRef<HTMLDivElement>(null)
  const [inlineVisible, setInlineVisible] = useState(false)

  // Hide the sticky bar while the inline summary (same price + CTA) is on screen.
  // The negative bottom margin treats the strip under the bar as off-screen.
  useEffect(() => {
    const el = summaryRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setInlineVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -80px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className={styles.summary} ref={summaryRef}>
        <span className={styles.total}>
          <Price prices={prices} />
        </span>
        <Button onClick={onAddToCart} size="lg" disabled={disabled}>
          {t('add_to_cart')}
        </Button>
        <Button variant="ghost" onClick={onShare} data-testid="share-button">
          {copied ? t('share_copied') : t('share')}
        </Button>
        {disabled && <p className={styles.invalidNote} role="status">{t('invalid_selection')}</p>}
      </div>

      {/* Sticky mobile bar — the inline price/CTA sits far below the fold on
          narrow screens, so mirror it in a fixed bottom bar (same handler).
          Hidden (and out of the tab order) while the inline summary is visible. */}
      <div
        className={[styles.stickyBar, inlineVisible ? styles.stickyBarHidden : ''].join(' ')}
        aria-hidden={inlineVisible || undefined}
      >
        <span className={styles.stickyPrice}>
          <Price prices={prices} />
        </span>
        <Button onClick={onAddToCart} size="lg" disabled={disabled} tabIndex={inlineVisible ? -1 : undefined}>
          {t('add_to_cart')}
        </Button>
      </div>
    </>
  )
}

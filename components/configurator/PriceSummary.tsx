'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import type { PriceMap } from '@/store/currency'
import styles from './Configurator.module.css'

interface PriceSummaryProps {
  prices: PriceMap
  copied: boolean
  onAddToCart: () => void
  onShare: () => void
}

export function PriceSummary({ prices, copied, onAddToCart, onShare }: PriceSummaryProps) {
  const t = useTranslations('configurator')

  return (
    <>
      <div className={styles.summary}>
        <span className={styles.total}>
          <Price prices={prices} />
        </span>
        <Button onClick={onAddToCart} size="lg">
          {t('add_to_cart')}
        </Button>
        <Button variant="ghost" onClick={onShare} data-testid="share-button">
          {copied ? t('share_copied') : t('share')}
        </Button>
      </div>

      {/* Sticky mobile bar — the inline price/CTA sits far below the fold on
          narrow screens, so mirror it in a fixed bottom bar (same handler). */}
      <div className={styles.stickyBar}>
        <span className={styles.stickyPrice}>
          <Price prices={prices} />
        </span>
        <Button onClick={onAddToCart} size="lg">
          {t('add_to_cart')}
        </Button>
      </div>
    </>
  )
}

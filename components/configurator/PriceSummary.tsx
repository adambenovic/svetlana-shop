'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import styles from './Configurator.module.css'

interface PriceSummaryProps {
  totalPrice: number
  currency: string
  copied: boolean
  onAddToCart: () => void
  onShare: () => void
}

export function PriceSummary({ totalPrice, currency, copied, onAddToCart, onShare }: PriceSummaryProps) {
  const t = useTranslations('configurator')

  return (
    <div className={styles.summary}>
      <span className={styles.total}>
        {(totalPrice / 100).toFixed(2)} {currency}
      </span>
      <Button onClick={onAddToCart} size="lg">
        {t('add_to_cart')}
      </Button>
      <Button variant="ghost" onClick={onShare} data-testid="share-button">
        {copied ? t('share_copied') : t('share')}
      </Button>
    </div>
  )
}

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { alternatesFor } from '@/components/layout/seo'

// Localized title + noindex for the checkout (and its success page, which can
// override these in its own metadata).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkout' })
  return {
    title: t('title'),
    alternates: alternatesFor('/checkout', locale),
    robots: { index: false, follow: true },
  }
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { alternatesFor } from '@/components/layout/seo'

// The cart page is a client component, so its metadata lives here: a localized
// title, and noindex — a per-visitor cart has no business in search results.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cart' })
  return {
    title: t('title'),
    alternates: alternatesFor('/cart', locale),
    robots: { index: false, follow: true },
  }
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}

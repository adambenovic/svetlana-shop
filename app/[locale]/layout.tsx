import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { CookieBanner } from '@/components/layout/CookieBanner'
import { CartHydration } from '@/components/CartHydration'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { BASE_URL, absoluteUrl, alternatesFor, openGraphFor, OG_IMAGE } from '@/components/layout/seo'
import '@/styles/globals.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })

  // Home ('/') baseline. Concrete pages refine canonical/hreflang for their
  // own route via their generateMetadata (that is where the route is known).
  return {
    metadataBase: new URL(BASE_URL),
    title: { default: t('default_title'), template: '%s | Svetlana Lampe' },
    description: t('default_description'),
    alternates: alternatesFor('/', locale),
    openGraph: openGraphFor({
      locale,
      href: '/',
      title: t('default_title'),
      description: t('default_description'),
    }),
    twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Svetlana Lampe',
    url: absoluteUrl(locale, '/'),
    logo: `${BASE_URL}/logo.png`,
    image: `${BASE_URL}/banner-desktop.webp`,
  }

  return (
    <html lang={locale}>
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <CartHydration />
          <AnnouncementBar />
          <Header locale={locale} />
          <main>{children}</main>
          <Footer locale={locale} />
          <CookieBanner />
          <CartDrawer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

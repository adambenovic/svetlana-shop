import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { CookieBanner } from '@/components/layout/CookieBanner'
import { CartHydration } from '@/components/CartHydration'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { BASE_URL, absoluteUrl, openGraphFor } from '@/components/layout/seo'
import { fontVariables } from '@/styles/fonts'
import { THEME_BOOTSTRAP_SCRIPT } from '@/styles/theme-bootstrap'
import '@/styles/globals.css'

// No generateStaticParams on purpose: every storefront page reads Payload/Postgres,
// which the Docker builder does not have, so nothing under [locale] is prerendered
// at build time — all routes render on request.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const t = await getTranslations({ locale, namespace: 'meta' })

  // Site-wide defaults only. Canonical/hreflang are route-specific, so each page
  // sets `alternates` itself — a layout-level canonical would point every page
  // that forgets to override it at the home page. Robots is left at the default
  // (index, follow): pages opt out themselves, and 404s get Next's noindex alone.
  return {
    metadataBase: new URL(BASE_URL),
    title: { default: t('default_title'), template: '%s | Svetlana Lampe' },
    description: t('default_description'),
    openGraph: {
      ...openGraphFor({
        locale,
        href: '/',
        title: t('default_title'),
        description: t('default_description'),
      }),
      // og:url is route-specific too; pages that set openGraph supply their own.
      url: undefined,
    },
    // No twitter:image — X falls back to og:image, which pages may override
    // (e.g. a product photo); a fixed twitter:image here would contradict it.
    twitter: { card: 'summary_large_image' },
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
  // The middleware skips paths with a dot (/.env, /wp-login.php, /favicon.ico),
  // which then land here with that segment as "locale" — 404 them instead of
  // rendering the home page with <html lang=".env">.
  if (!hasLocale(routing.locales, locale)) notFound()
  // Bind next-intl's request locale to the URL segment (also for requests the
  // middleware did not see), so server translations always match <html lang>.
  setRequestLocale(locale)
  const messages = await getMessages()
  const ta = await getTranslations({ locale, namespace: 'accessibility' })

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Svetlana Lampe',
    url: absoluteUrl(locale, '/'),
    logo: `${BASE_URL}/logo-512.png`,
    image: `${BASE_URL}/banner-desktop.webp`,
  }

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">{ta('skip_to_text')}</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <NextIntlClientProvider messages={messages}>
          <CartHydration />
          <AnnouncementBar />
          <Header locale={locale} />
          <main id="main" tabIndex={-1}>{children}</main>
          <Footer locale={locale} />
          <CookieBanner />
          <CartDrawer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

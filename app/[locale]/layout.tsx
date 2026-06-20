import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { CookieBanner } from '@/components/layout/CookieBanner'
import { CartHydration } from '@/components/CartHydration'
import { CartDrawer } from '@/components/cart/CartDrawer'
import '@/styles/globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    metadataBase: new URL(BASE_URL),
    title: { default: 'Svetlana Lampe', template: '%s | Svetlana Lampe' },
    description: 'Handcrafted 3D-printed table lamps. Design your own — infinite color combinations.',
    openGraph: {
      siteName: 'Svetlana Lampe',
      locale,
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
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

  return (
    <html lang={locale}>
      <body>
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

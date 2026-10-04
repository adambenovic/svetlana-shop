import type { MetadataRoute } from 'next'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { BASE_URL } from '@/components/layout/seo'

// Cart and checkout (incl. checkout/success, a sub-path) in every locale's
// localized form: /kosik, /de/warenkorb, /pokladna, /en/checkout, …
const transactionalPaths = routing.locales.flatMap(locale =>
  (['/cart', '/checkout'] as const).map(href => getPathname({ href, locale })),
)

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Product photos are Payload uploads served under /api — keep them
        // crawlable for image search and Product rich results (the longer,
        // more specific allow wins over the /api/ disallow).
        allow: ['/', '/api/media/file/'],
        disallow: ['/admin', '/api/', ...transactionalPaths],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}

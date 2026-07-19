import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Queries Payload — must render at request time, not during `next build`
// (the Docker builder has no database or PAYLOAD_SECRET).
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const LOCALES = routing.locales

type Href = Parameters<typeof getPathname>[0]['href']

function url(locale: (typeof LOCALES)[number], href: Href) {
  return `${BASE_URL}${getPathname({ href, locale })}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })

  const [{ docs: products }, { docs: pages }] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { status: { equals: 'published' } },
      limit: 500,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'pages',
      limit: 200,
      select: { slug: true, updatedAt: true },
    }),
  ])

  // Cart/checkout are transactional (noindex) — never in the sitemap.
  const staticRoutes = ['/', '/configurator', '/gallery'] as const

  // Utility/help pages carry no SEO value — keep them out of the sitemap.
  const EXCLUDED_PAGE_SLUGS = new Set(['cookie-preferences', 'lamp-manual', 'declaration-of-conformity'])

  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    for (const route of staticRoutes) {
      // No lastModified on static routes — a per-request `new Date()` is fake
      // precision that only churns the sitemap.
      entries.push({
        url: url(locale, route),
        changeFrequency: 'weekly',
        priority: route === '/' ? 1 : 0.8,
      })
    }
    for (const p of products) {
      if (!p.slug) continue
      entries.push({
        url: url(locale, { pathname: '/products/[slug]', params: { slug: String(p.slug) } }),
        lastModified: new Date(p.updatedAt as string),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
    for (const p of pages) {
      if (!p.slug || EXCLUDED_PAGE_SLUGS.has(String(p.slug))) continue
      entries.push({
        url: url(locale, { pathname: '/pages/[slug]', params: { slug: String(p.slug) } }),
        lastModified: new Date(p.updatedAt as string),
        changeFrequency: 'yearly',
        priority: 0.5,
      })
    }
  }

  return entries
}

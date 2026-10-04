import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { routing } from '@/i18n/routing'
import { absoluteUrl } from '@/components/layout/seo'

// Queries Payload — must render at request time, not during `next build`
// (the Docker builder has no database or PAYLOAD_SECRET).
export const dynamic = 'force-dynamic'

// Legal texts are canonical under the policies route. The two document pages
// (lamp-manual, declaration-of-conformity) are left out: they are noindex — the
// same English PDF rendered as images in every locale.
const LEGAL_HANDLES = new Set([
  'privacy-policy',
  'terms-of-service',
  'refund-policy',
  'shipping-policy',
  'cookie-preferences',
  'contact-information',
])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })

  const [{ docs: products }, { docs: pages }] = await Promise.all([
    payload.find({
      collection: 'products',
      // The configurator base product has no page (it redirects to the configurator).
      where: { and: [{ status: { equals: 'published' } }, { configuratorOnly: { not_equals: true } }] },
      limit: 500,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'pages',
      limit: 200,
      select: { slug: true, updatedAt: true },
    }),
  ])

  // Cart/checkout are transactional — never in the sitemap. The gallery is
  // listed only while it has products (an empty gallery is a thin page).
  const staticRoutes = products.length > 0
    ? (['/', '/configurator', '/gallery'] as const)
    : (['/', '/configurator'] as const)

  const entries: MetadataRoute.Sitemap = []

  for (const locale of routing.locales) {
    for (const route of staticRoutes) {
      // No lastModified on static routes — a per-request `new Date()` is fake
      // precision that only churns the sitemap.
      entries.push({
        url: absoluteUrl(locale, route),
        changeFrequency: 'weekly',
        priority: route === '/' ? 1 : 0.8,
      })
    }
    for (const p of products) {
      if (!p.slug) continue
      entries.push({
        url: absoluteUrl(locale, { pathname: '/products/[slug]', params: { slug: String(p.slug) } }),
        lastModified: new Date(p.updatedAt as string),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
    for (const p of pages) {
      const slug = String(p.slug ?? '')
      if (!LEGAL_HANDLES.has(slug)) continue
      entries.push({
        url: absoluteUrl(locale, { pathname: '/policies/[handle]', params: { handle: slug } }),
        lastModified: new Date(p.updatedAt as string),
        changeFrequency: 'yearly',
        priority: 0.5,
      })
    }
  }

  return entries
}

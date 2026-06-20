import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const LOCALES = ['sk', 'en', 'cs', 'de', 'es', 'fr', 'hu', 'it', 'pl', 'uk']
const DEFAULT_LOCALE = 'sk'

function url(locale: string, path: string) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
  return `${BASE_URL}${prefix}${path}`
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

  const staticRoutes = ['/', '/configurator', '/gallery', '/cart']
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    for (const route of staticRoutes) {
      entries.push({
        url: url(locale, route),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '/' ? 1 : 0.8,
      })
    }
    for (const p of products) {
      if (!p.slug) continue
      entries.push({
        url: url(locale, `/products/${p.slug}`),
        lastModified: new Date(p.updatedAt as string),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
    for (const p of pages) {
      if (!p.slug) continue
      entries.push({
        url: url(locale, `/pages/${p.slug}`),
        lastModified: new Date(p.updatedAt as string),
        changeFrequency: 'yearly',
        priority: 0.5,
      })
    }
  }

  return entries
}

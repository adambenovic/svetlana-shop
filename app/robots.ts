import type { MetadataRoute } from 'next'
import { BASE_URL } from '@/components/layout/seo'

// Only /api/ is blocked. Pages that must stay out of the index (cart, checkout,
// admin) are crawlable on purpose and say `noindex` themselves: Google cannot
// read a noindex on a URL robots.txt blocks, so it indexes such URLs bare
// ("Indexed, though blocked by robots.txt").
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Product photos are Payload uploads served under /api — keep them
        // crawlable for image search and Product rich results (the longer,
        // more specific allow wins over the /api/ disallow).
        allow: ['/', '/api/media/file/'],
        disallow: ['/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}

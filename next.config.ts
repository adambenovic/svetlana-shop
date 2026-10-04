import createNextIntlPlugin from 'next-intl/plugin'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

// Sent on every response. No script-src/style-src policy yet (owner decision
// pending — inline scripts and the GoPay/Packeta embeds need a nonce plan first);
// this CSP only blocks framing by other sites, <base> hijacking and plugins.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Geolocation only for the Packeta pickup-point map ("find points near me").
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self "https://widget.packeta.com"), browsing-topics=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
]

// Static files in public/ are not content-hashed, so Next.js serves them with
// max-age=0. These change only on deploy: cache for a week, then serve stale
// for up to 30 days while revalidating in the background.
const STATIC_ASSET_CACHE = [
  { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' },
]
const TOP_LEVEL_IMAGES = [
  'banner-desktop.webp',
  'banner-mobile.webp',
  'og-image.jpg',
  'logo.png',
  'logo-512.png',
  'logo.svg',
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'svetlanalampe.sk' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/assets/:path*', headers: STATIC_ASSET_CACHE },
      { source: '/docs/:path*', headers: STATIC_ASSET_CACHE },
      { source: '/parts.json', headers: STATIC_ASSET_CACHE },
      ...TOP_LEVEL_IMAGES.map(file => ({ source: `/${file}`, headers: STATIC_ASSET_CACHE })),
    ]
  },
  async redirects() {
    return [
      {
        // Vanity link → the English lamp-manual page currently in use.
        // 307 (not cached) so the target can be retargeted later.
        source: '/pages/manual',
        destination: '/en/pages/lamp-manual',
        permanent: false,
      },
    ]
  },
}

/**
 * withPayload appends a `/:path*` rule with Accept-CH / Vary / Critical-CH:
 * Sec-CH-Prefers-Color-Scheme, which only the Payload admin uses (to render its
 * theme server-side). On the storefront that Vary splits every cached response
 * by colour scheme and Critical-CH can make browsers retry the first request —
 * so narrow the rule to the admin. (X-Powered-By is not added: poweredByHeader
 * is false above, and withPayload only appends it when it is not.)
 */
function scopePayloadClientHintsToAdmin(config: NextConfig): NextConfig {
  const payloadHeaders = config.headers
  if (!payloadHeaders) return config
  return {
    ...config,
    async headers() {
      const rules = await payloadHeaders()
      return rules.map(rule =>
        rule.source === '/:path*' && rule.headers.some(h => h.key === 'Accept-CH')
          ? { ...rule, source: '/admin/:path*' }
          : rule,
      )
    },
  }
}

export default withNextIntl(scopePayloadClientHintsToAdmin(withPayload(nextConfig)))

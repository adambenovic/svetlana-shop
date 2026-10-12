import createNextIntlPlugin from 'next-intl/plugin'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { routing } from './i18n/routing'

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

/**
 * Permanent redirects for URLs Google still knows from earlier versions of the
 * site. next-intl alone would answer some of them with a temporary 307, which
 * keeps the old URL in Google's index.
 * - Before 19 July every locale used the internal paths (/cart, /cs/configurator,
 *   /de/products/…); they now point at the localized ones (/kosik, /cs/konfigurator…).
 * - The old Shopify store linked /collections/…; the configurator sells those lamps now.
 * - The default locale has no prefix: /sk/… → /….
 */
function legacyRedirects() {
  const toPattern = (path: string) => path.replace(/\[(\w+)\]/g, ':$1')
  const out: { source: string; destination: string; permanent: true }[] = []
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
    const localizedPath = (internal: string) => {
      const value = (routing.pathnames as Record<string, string | Record<string, string>>)[internal]
      return typeof value === 'string' ? value : value[locale]
    }
    for (const internal of Object.keys(routing.pathnames)) {
      const external = localizedPath(internal)
      if (external === internal) continue
      out.push({ source: prefix + toPattern(internal), destination: prefix + toPattern(external), permanent: true })
    }
    out.push({ source: `${prefix}/collections/:path*`, destination: prefix + localizedPath('/configurator'), permanent: true })
  }
  // The first segment is restricted to [A-Za-z0-9-] so the destination can never
  // start with `//` or `/\` (a protocol-relative open redirect), independent of
  // Next.js collapsing repeated slashes before matching.
  out.push(
    { source: `/${routing.defaultLocale}`, destination: '/', permanent: true },
    { source: `/${routing.defaultLocale}/:first([A-Za-z0-9-]+)/:rest*`, destination: '/:first/:rest*', permanent: true },
  )
  return out
}

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
      // The admin is crawlable (robots.txt blocks only /api/) so this can be seen.
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/assets/:path*', headers: STATIC_ASSET_CACHE },
      { source: '/docs/:path*', headers: STATIC_ASSET_CACHE },
      { source: '/parts.json', headers: STATIC_ASSET_CACHE },
      ...TOP_LEVEL_IMAGES.map(file => ({ source: `/${file}`, headers: STATIC_ASSET_CACHE })),
    ]
  },
  async redirects() {
    return [
      // Plain-HTTP visitors (Cloudflare reports the visitor's scheme in
      // CF-Visitor; the tunnel itself reaches the app over http) → HTTPS.
      // Local requests (healthcheck, ops scripts) carry no CF-Visitor header.
      ...(APP_URL.startsWith('https://')
        ? [{
            source: '/:path*',
            has: [{ type: 'header' as const, key: 'cf-visitor', value: '.*"scheme":"http".*' }],
            destination: `${APP_URL}/:path*`,
            permanent: true,
          }]
        : []),
      {
        // Vanity link → the English lamp-manual page currently in use.
        // 307 (not cached) so the target can be retargeted later.
        source: '/pages/manual',
        destination: '/en/pages/lamp-manual',
        permanent: false,
      },
      // After /pages/manual: the first matching rule wins.
      ...legacyRedirects(),
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

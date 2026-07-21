import createNextIntlPlugin from 'next-intl/plugin'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'svetlanalampe.sk' },
    ],
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

export default withNextIntl(withPayload(nextConfig))

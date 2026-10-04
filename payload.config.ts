import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Pages } from './collections/Pages'
import { Discounts } from './collections/Discounts'
import { CurrencySettings } from './globals/CurrencySettings'
import { migrations } from './migrations'
import { ensureConfiguratorProduct } from './lib/configurator-product'
import { brevoEmailAdapter } from './lib/payload-email'

// Public origin, inlined at build time (NEXT_PUBLIC_*). Absolute admin links —
// e.g. the password-reset URL in emails — are built from it.
const appURL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')

export default buildConfig({
  serverURL: appURL,
  // Origins allowed to authenticate with the admin cookie (Payload rejects the
  // cookie on cross-origin requests). Payload adds serverURL itself; the
  // loopback port of the tunnel deploy allows admin access from the host.
  csrf: [appURL, 'http://localhost:43117'].filter(Boolean),
  email: brevoEmailAdapter(),
  // Multipart parser limit for uploads (Media); larger files get a 413
  upload: {
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
  },
  telemetry: false,
  onInit: async (payload) => {
    try {
      const { created } = await ensureConfiguratorProduct(payload)
      if (created) payload.logger.info('Seeded default configurator product')
    } catch (err) {
      payload.logger.error({ err }, 'Failed to ensure configurator product exists')
    }
  },
  admin: { user: 'users' },
  collections: [Products, Orders, Media, Users, Pages, Discounts],
  globals: [CurrencySettings],
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI },
    // Auto-run pending migrations on startup in production (dev uses schema push)
    prodMigrations: migrations,
  }),
  secret: process.env.PAYLOAD_SECRET!,
  localization: {
    locales: ['sk', 'en', 'cs', 'de', 'es', 'fr', 'hu', 'it', 'pl', 'uk'],
    defaultLocale: 'sk',
  },
})

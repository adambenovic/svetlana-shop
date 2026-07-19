import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Pages } from './collections/Pages'
import { Discounts } from './collections/Discounts'
import { migrations } from './migrations'
import { ensureConfiguratorProduct } from './lib/configurator-product'

export default buildConfig({
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

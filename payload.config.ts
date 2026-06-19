import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { Media } from './collections/Media'
import { Users } from './collections/Users'

export default buildConfig({
  admin: { user: 'users' },
  collections: [Products, Orders, Media, Users],
  editor: lexicalEditor({}),
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } }),
  secret: process.env.PAYLOAD_SECRET!,
  localization: {
    locales: ['sk', 'en', 'cs', 'de', 'es', 'fr', 'hu', 'it', 'pl', 'uk'],
    defaultLocale: 'sk',
  },
})

import path from 'path'
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  // Product/page images are shown on the public storefront
  access: { read: () => true },
  upload: {
    // Relative staticDir resolves against the CWD (/app in the image) — point
    // it at the path the compose `media` volume is mounted on
    staticDir: path.resolve(process.cwd(), 'public/media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  fields: [
    { name: 'alt', type: 'text', localized: true },
  ],
}

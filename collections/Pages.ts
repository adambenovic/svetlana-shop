import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title' },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'URL slug, e.g. privacy-policy or legal-notice' },
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      localized: true,
      admin: { description: 'Raw HTML (used instead of body rich text when present)' },
    },
  ],
}

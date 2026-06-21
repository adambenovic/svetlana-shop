import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'richText', localized: true },
    { name: 'basePrice', type: 'number', required: true, admin: { description: 'Price in smallest unit (haléře/cents). €89 = 8900' } },
    { name: 'currency', type: 'select', options: ['EUR', 'CZK'], defaultValue: 'EUR' },
    {
      name: 'images',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'alt', type: 'text', localized: true },
      ],
    },
    { name: 'hasBg', type: 'checkbox', defaultValue: false, admin: { description: 'Use object-fit: cover (product has background photo)' } },
    { name: 'partsKey', type: 'text', admin: { description: 'Key in public/parts.json for configurator options (e.g. "leah")' } },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
    },
    {
      name: 'configuratorOnly',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hidden from gallery — used as base product for all configurator orders' },
    },
  ],
}

import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'richText', localized: true },
    { name: 'basePrice', type: 'number', required: true, admin: { description: 'EUR price in cents. €89 = 8900' } },
    { name: 'currency', type: 'select', options: ['EUR', 'CZK'], defaultValue: 'EUR', admin: { hidden: true, description: 'Legacy — EUR is the canonical currency, other currencies live in prices' } },
    {
      name: 'prices',
      type: 'group',
      admin: { description: 'Manual prices per currency, in smallest unit (haléře/grosze/fillér). Empty = customers paying in that currency see the EUR price.' },
      fields: [
        { name: 'czk', type: 'number', admin: { description: 'CZK price in haléře. 2290 Kč = 229000' } },
        { name: 'pln', type: 'number', admin: { description: 'PLN price in grosze. 379 zł = 37900' } },
        { name: 'huf', type: 'number', admin: { description: 'HUF price ×100. 35900 Ft = 3590000' } },
      ],
    },
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

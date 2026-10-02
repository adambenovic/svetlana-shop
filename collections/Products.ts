import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'configuration',
      type: 'json',
      admin: { description: 'Fixed configurator selection (base/shade/color/cable/switch/plug/bulb ids) for signature/gallery products — the storefront composites the render images from this.' },
    },
    { name: 'basePrice', type: 'number', required: true, admin: { description: 'EUR price in cents. €89 = 8900' } },
    { name: 'currency', type: 'select', options: ['EUR', 'CZK'], defaultValue: 'EUR', admin: { hidden: true, description: 'Legacy — EUR is the canonical currency, other currencies live in prices' } },
    {
      name: 'prices',
      type: 'group',
      admin: { description: 'OPTIONAL fixed prices per currency, in smallest unit (haléře/grosze/fillér). Leave EMPTY (recommended) to convert automatically from the EUR price using Currency settings — converted prices follow every EUR price change. A value here stays fixed even when the EUR price changes.' },
      fields: [
        { name: 'czk', type: 'number', admin: { description: 'Fixed CZK price in haléře (1319 Kč = 131900). Empty = auto-convert.' } },
        { name: 'pln', type: 'number', admin: { description: 'Fixed PLN price in grosze (235,99 zł = 23599). Empty = auto-convert.' } },
        { name: 'huf', type: 'number', admin: { description: 'Fixed HUF price ×100 (19 790 Ft = 1979000). Empty = auto-convert.' } },
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

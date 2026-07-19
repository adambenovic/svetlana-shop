import type { CollectionConfig } from 'payload'

export const Discounts: CollectionConfig = {
  slug: 'discounts',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'percent', 'active', 'usedCount', 'maxUses'],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Customers enter this at checkout — stored uppercase' },
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)],
      },
    },
    { name: 'percent', type: 'number', required: true, min: 1, max: 100, admin: { description: 'Discount in % off the order total' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'maxUses', type: 'number', admin: { description: 'Empty = unlimited' } },
    { name: 'usedCount', type: 'number', defaultValue: 0, admin: { readOnly: true, description: 'Incremented atomically when an order with this code is paid' } },
    { name: 'validUntil', type: 'date', admin: { description: 'Empty = no expiry' } },
  ],
  timestamps: true,
}

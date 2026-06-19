import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: { useAsTitle: 'orderNumber', defaultColumns: ['orderNumber', 'status', 'customer', 'totalAmount', 'shipmentError', 'createdAt'] },
  fields: [
    { name: 'orderNumber', type: 'text', required: true, unique: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
    },
    { name: 'locale', type: 'text' },
    {
      name: 'customer',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text', required: true },
      ],
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'productId', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'configuration', type: 'json' },
        { name: 'quantity', type: 'number', min: 1 },
        { name: 'unitPrice', type: 'number' },
      ],
    },
    {
      name: 'shipping',
      type: 'group',
      fields: [
        { name: 'packetaPointId', type: 'number' },
        { name: 'packetaPointName', type: 'text' },
        { name: 'packetaPointCity', type: 'text' },
      ],
    },
    { name: 'totalAmount', type: 'number', required: true },
    { name: 'currency', type: 'text', defaultValue: 'EUR' },
    { name: 'gopayId', type: 'text' },
    { name: 'packetaId', type: 'text' },
    { name: 'shipmentError', type: 'text', admin: { description: 'Set when Packeta shipment creation fails — needs manual retry' } },
  ],
  timestamps: true,
}

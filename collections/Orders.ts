import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: { useAsTitle: 'orderNumber', defaultColumns: ['orderNumber', 'status', 'customer', 'totalAmount', 'createdAt'] },
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
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
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
      name: 'billing',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'zip', type: 'text' },
        { name: 'country', type: 'text', admin: { description: 'ISO 3166-1 alpha-2, e.g. SK' } },
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
        { name: 'packetaPointCountry', type: 'text', admin: { description: 'ISO 3166-1 alpha-2 of the pickup point — drives destination VAT' } },
      ],
    },
    { name: 'totalAmount', type: 'number', required: true, admin: { description: 'Final charged amount (after discount), smallest unit' } },
    { name: 'currency', type: 'text', defaultValue: 'EUR' },
    { name: 'discountCode', type: 'text' },
    { name: 'discountPercent', type: 'number' },
    { name: 'gopayId', type: 'text' },
    { name: 'invoiceNumber', type: 'text', admin: { description: 'Assigned from a DB sequence when the order is paid' } },
    { name: 'invoiceToken', type: 'text', admin: { description: 'Unguessable token for the customer invoice link' } },
    { name: 'invoiceIssuedAt', type: 'date' },
    { name: 'vatCountry', type: 'text' },
    { name: 'vatRate', type: 'number' },
    { name: 'packetaId', type: 'text', admin: { description: 'Filled manually after creating the shipment in the Packeta client' } },
  ],
  timestamps: true,
}

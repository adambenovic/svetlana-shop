import type { GlobalConfig } from 'payload'
import { DEFAULT_RATES } from '../lib/prices'

// Exchange rates used to derive CZK/PLN/HUF prices from each product's EUR
// price. A product's manual per-currency override (Products → prices) wins.
export const CurrencySettings: GlobalConfig = {
  slug: 'currency-settings',
  label: 'Currency settings',
  admin: {
    description: 'Exchange rates (1 EUR = …) used to convert every EUR price into CZK, PLN and HUF. Converted prices are rounded to clean retail prices (…9 Kč, …,99 zł, …90 Ft). Changing a rate updates all prices immediately.',
  },
  fields: [
    { name: 'czkRate', label: '1 EUR = … CZK', type: 'number', required: true, min: 0.0001, defaultValue: DEFAULT_RATES.CZK },
    { name: 'plnRate', label: '1 EUR = … PLN', type: 'number', required: true, min: 0.0001, defaultValue: DEFAULT_RATES.PLN },
    { name: 'hufRate', label: '1 EUR = … HUF', type: 'number', required: true, min: 0.0001, defaultValue: DEFAULT_RATES.HUF },
  ],
}

import * as migration_20260719_063934_initial from './20260719_063934_initial';
import * as migration_20260719_073350_billing_address from './20260719_073350_billing_address';
import * as migration_20260719_081534_drop_shipment_error from './20260719_081534_drop_shipment_error';
import * as migration_20260719_092033_currency_and_discounts from './20260719_092033_currency_and_discounts';
import * as migration_20260719_131755_invoices from './20260719_131755_invoices';
import * as migration_20260719_184233_review_fixes from './20260719_184233_review_fixes';

export const migrations = [
  {
    up: migration_20260719_063934_initial.up,
    down: migration_20260719_063934_initial.down,
    name: '20260719_063934_initial',
  },
  {
    up: migration_20260719_073350_billing_address.up,
    down: migration_20260719_073350_billing_address.down,
    name: '20260719_073350_billing_address',
  },
  {
    up: migration_20260719_081534_drop_shipment_error.up,
    down: migration_20260719_081534_drop_shipment_error.down,
    name: '20260719_081534_drop_shipment_error',
  },
  {
    up: migration_20260719_092033_currency_and_discounts.up,
    down: migration_20260719_092033_currency_and_discounts.down,
    name: '20260719_092033_currency_and_discounts',
  },
  {
    up: migration_20260719_131755_invoices.up,
    down: migration_20260719_131755_invoices.down,
    name: '20260719_131755_invoices',
  },
  {
    up: migration_20260719_184233_review_fixes.up,
    down: migration_20260719_184233_review_fixes.down,
    name: '20260719_184233_review_fixes'
  },
];

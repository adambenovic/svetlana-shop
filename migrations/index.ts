import * as migration_20260719_063934_initial from './20260719_063934_initial';
import * as migration_20260719_073350_billing_address from './20260719_073350_billing_address';
import * as migration_20260719_081534_drop_shipment_error from './20260719_081534_drop_shipment_error';
import * as migration_20260719_092033_currency_and_discounts from './20260719_092033_currency_and_discounts';
import * as migration_20260719_131755_invoices from './20260719_131755_invoices';
import * as migration_20260719_184233_review_fixes from './20260719_184233_review_fixes';
import * as migration_20261002_091605_currency_settings from './20261002_091605_currency_settings';
import * as migration_20261004_112523_audit_fixes from './20261004_112523_audit_fixes';
import * as migration_20261004_114329_payload_3_90 from './20261004_114329_payload_3_90';

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
    name: '20260719_184233_review_fixes',
  },
  {
    up: migration_20261002_091605_currency_settings.up,
    down: migration_20261002_091605_currency_settings.down,
    name: '20261002_091605_currency_settings',
  },
  {
    up: migration_20261004_112523_audit_fixes.up,
    down: migration_20261004_112523_audit_fixes.down,
    name: '20261004_112523_audit_fixes',
  },
  {
    up: migration_20261004_114329_payload_3_90.up,
    down: migration_20261004_114329_payload_3_90.down,
    name: '20261004_114329_payload_3_90'
  },
];

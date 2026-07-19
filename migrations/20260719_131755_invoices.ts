import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Continuous invoice numbering (faktúra poradové číslo)
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;`)

  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "invoice_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "invoice_token" varchar;
  ALTER TABLE "orders" ADD COLUMN "invoice_issued_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "vat_country" varchar;
  ALTER TABLE "orders" ADD COLUMN "vat_rate" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP SEQUENCE IF EXISTS invoice_number_seq;`)

  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "invoice_number";
  ALTER TABLE "orders" DROP COLUMN "invoice_token";
  ALTER TABLE "orders" DROP COLUMN "invoice_issued_at";
  ALTER TABLE "orders" DROP COLUMN "vat_country";
  ALTER TABLE "orders" DROP COLUMN "vat_rate";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_status" ADD VALUE 'refunded';
  ALTER TABLE "products_locales" ALTER COLUMN "description" SET DATA TYPE varchar;
  ALTER TABLE "products" ADD COLUMN "configuration" jsonb;
  ALTER TABLE "orders" ADD COLUMN "shipping_packeta_point_country" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'shipped', 'cancelled', 'failed');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
  ALTER TABLE "products_locales" ALTER COLUMN "description" SET DATA TYPE jsonb;
  ALTER TABLE "products" DROP COLUMN "configuration";
  ALTER TABLE "orders" DROP COLUMN "shipping_packeta_point_country";`)
}

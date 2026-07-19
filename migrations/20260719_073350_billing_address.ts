import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_status" ADD VALUE 'failed';
  ALTER TABLE "orders" ADD COLUMN "billing_street" varchar;
  ALTER TABLE "orders" ADD COLUMN "billing_city" varchar;
  ALTER TABLE "orders" ADD COLUMN "billing_zip" varchar;
  ALTER TABLE "orders" ADD COLUMN "billing_country" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'shipped', 'cancelled');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
  ALTER TABLE "orders" DROP COLUMN "billing_street";
  ALTER TABLE "orders" DROP COLUMN "billing_city";
  ALTER TABLE "orders" DROP COLUMN "billing_zip";
  ALTER TABLE "orders" DROP COLUMN "billing_country";`)
}

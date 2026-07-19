import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "discounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"percent" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"max_uses" numeric,
  	"used_count" numeric DEFAULT 0,
  	"valid_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "prices_czk" numeric;
  ALTER TABLE "products" ADD COLUMN "prices_pln" numeric;
  ALTER TABLE "products" ADD COLUMN "prices_huf" numeric;
  ALTER TABLE "orders" ADD COLUMN "discount_code" varchar;
  ALTER TABLE "orders" ADD COLUMN "discount_percent" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "discounts_id" integer;
  CREATE UNIQUE INDEX "discounts_code_idx" ON "discounts" USING btree ("code");
  CREATE INDEX "discounts_updated_at_idx" ON "discounts" USING btree ("updated_at");
  CREATE INDEX "discounts_created_at_idx" ON "discounts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discounts_fk" FOREIGN KEY ("discounts_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_discounts_id_idx" ON "payload_locked_documents_rels" USING btree ("discounts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "discounts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "discounts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_discounts_fk";
  
  DROP INDEX "payload_locked_documents_rels_discounts_id_idx";
  ALTER TABLE "products" DROP COLUMN "prices_czk";
  ALTER TABLE "products" DROP COLUMN "prices_pln";
  ALTER TABLE "products" DROP COLUMN "prices_huf";
  ALTER TABLE "orders" DROP COLUMN "discount_code";
  ALTER TABLE "orders" DROP COLUMN "discount_percent";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "discounts_id";`)
}

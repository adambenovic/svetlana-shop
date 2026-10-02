import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "currency_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"czk_rate" numeric DEFAULT 24.459 NOT NULL,
  	"pln_rate" numeric DEFAULT 4.3735 NOT NULL,
  	"huf_rate" numeric DEFAULT 367.18 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "currency_settings" CASCADE;`)
}

ALTER TYPE "public"."appointment_status" ADD VALUE 'checked_in';--> statement-breakpoint
CREATE TABLE "receptionists" (
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_results" RENAME COLUMN "file_path" TO "file_name";--> statement-breakpoint
ALTER TABLE "receptionists" ADD CONSTRAINT "receptionists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
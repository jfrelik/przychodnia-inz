ALTER TABLE "appointments" ALTER COLUMN "recommendation_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "prescription_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;
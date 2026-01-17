ALTER TABLE "patients" DROP CONSTRAINT "patients_pesel_unique";--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "pesel_hmac" text NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "pesel_enc" text NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "pesel";--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_pesel_hmac_unique" UNIQUE("pesel_hmac");
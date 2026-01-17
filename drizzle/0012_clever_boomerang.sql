CREATE TABLE "medications" (
	"medication_id" serial PRIMARY KEY NOT NULL,
	"prescription_id" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescription_id_prescriptions_prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("prescription_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "medications";
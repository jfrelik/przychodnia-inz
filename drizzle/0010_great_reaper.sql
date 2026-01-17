ALTER TABLE "specializations" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "specializations" ADD COLUMN "icon" text DEFAULT 'lucide:stethoscope' NOT NULL;
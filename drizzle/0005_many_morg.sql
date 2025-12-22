CREATE TYPE "public"."appointment_type" AS ENUM('consultation', 'procedure');--> statement-breakpoint
CREATE TABLE "room_specializations" (
	"room_id" integer NOT NULL,
	"specialization_id" integer NOT NULL,
	CONSTRAINT "room_specializations_room_id_specialization_id_pk" PRIMARY KEY("room_id","specialization_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "recommendation_id" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "recommendation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "prescription_id" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "prescription_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "type" "appointment_type" DEFAULT 'consultation' NOT NULL;--> statement-breakpoint
ALTER TABLE "room_specializations" ADD CONSTRAINT "room_specializations_room_id_room_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("room_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_specializations" ADD CONSTRAINT "room_specializations_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE cascade ON UPDATE no action;
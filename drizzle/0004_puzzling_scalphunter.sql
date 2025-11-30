CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('active', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'doctor', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text NOT NULL,
	"banned" boolean NOT NULL,
	"ban_reason" text,
	"ban_expires" date,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"appointment_id" serial PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"doctor_id" text NOT NULL,
	"datetime" timestamp NOT NULL,
	"status" "appointment_status" NOT NULL,
	"notes" text,
	"recommendation_id" integer NOT NULL,
	"prescription_id" integer NOT NULL,
	"room_room_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"schedule_id" text PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"time_start" time NOT NULL,
	"time_end" time NOT NULL,
	"doctors_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"user_id" text PRIMARY KEY NOT NULL,
	"specialization_id" integer,
	"license_number" text NOT NULL,
	CONSTRAINT "doctors_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"record_id" serial PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_records_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"test_id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"test_type" text NOT NULL,
	"result" text NOT NULL,
	"test_date" date NOT NULL,
	"file_path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"pesel" text NOT NULL,
	"date_of_birth" date,
	"phone" text,
	"address" text NOT NULL,
	CONSTRAINT "patients_pesel_unique" UNIQUE("pesel")
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"prescription_id" serial PRIMARY KEY NOT NULL,
	"medications" jsonb NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"status" "prescription_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"recommendation_id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room" (
	"room_id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "specializations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_user_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_recommendation_id_recommendations_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("recommendation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_prescription_id_prescriptions_prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("prescription_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_room_id_room_room_id_fk" FOREIGN KEY ("room_room_id") REFERENCES "public"."room"("room_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_doctors_user_id_doctors_user_id_fk" FOREIGN KEY ("doctors_user_id") REFERENCES "public"."doctors"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_record_id_medical_records_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."medical_records"("record_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
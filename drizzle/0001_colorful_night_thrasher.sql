CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"max_days_per_year" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leave_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "leave_type_id" integer;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;
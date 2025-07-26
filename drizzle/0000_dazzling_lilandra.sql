CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'early_departure');--> statement-breakpoint
CREATE TYPE "public"."employee_group" AS ENUM('group_a', 'group_b');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."holiday_type" AS ENUM('annual', 'special', 'weekend');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'casual', 'maternity', 'paternity');--> statement-breakpoint
CREATE TYPE "public"."overtime_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"status" "attendance_status" NOT NULL,
	"working_hours" numeric(4, 2),
	"overtime_hours" numeric(4, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biometric_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(50) NOT NULL,
	"location" varchar(100) NOT NULL,
	"ip" varchar(45) NOT NULL,
	"port" integer DEFAULT 4370 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "biometric_devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"employee_id" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(255),
	"photo_url" varchar(255),
	"department_id" integer NOT NULL,
	"position" varchar(255),
	"employee_group" "employee_group" NOT NULL,
	"join_date" timestamp NOT NULL,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"biometric_device_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"date" timestamp NOT NULL,
	"type" "holiday_type" NOT NULL,
	"description" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"applicable_groups" varchar(50)[] DEFAULT '{"group_a","group_b"}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"days" integer NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"approved_by" varchar(50),
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overtime_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"hours" numeric(4, 2) NOT NULL,
	"reason" text,
	"status" "overtime_status" DEFAULT 'pending' NOT NULL,
	"approved_by" varchar(50),
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"type" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"reason" text,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"approved_by" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_date_idx" ON "attendance" USING btree ("employee_id","date");
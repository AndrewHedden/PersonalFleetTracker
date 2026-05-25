CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cognito_sub" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_cognito_sub_unique" UNIQUE("cognito_sub"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"year" integer,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"vin" text,
	"license_plate" text,
	"color" text,
	"purchase_odometer" integer,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_year_check" CHECK ("vehicles"."year" IS NULL OR ("vehicles"."year" BETWEEN 1900 AND 2100)),
	CONSTRAINT "vehicles_purchase_odometer_nonneg" CHECK ("vehicles"."purchase_odometer" IS NULL OR "vehicles"."purchase_odometer" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fuel_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"odometer" integer NOT NULL,
	"gallons" numeric(8, 3) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"price_per_gallon" numeric(6, 3) NOT NULL,
	"tank_filled" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fuel_entries_odometer_nonneg" CHECK ("fuel_entries"."odometer" >= 0),
	CONSTRAINT "fuel_entries_gallons_positive" CHECK ("fuel_entries"."gallons" > 0),
	CONSTRAINT "fuel_entries_total_cost_nonneg" CHECK ("fuel_entries"."total_cost" >= 0),
	CONSTRAINT "fuel_entries_price_per_gallon_nonneg" CHECK ("fuel_entries"."price_per_gallon" >= 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"odometer" integer NOT NULL,
	"total_cost" numeric(10, 2),
	"shop_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_entries_odometer_nonneg" CHECK ("maintenance_entries"."odometer" >= 0),
	CONSTRAINT "maintenance_entries_total_cost_nonneg" CHECK ("maintenance_entries"."total_cost" IS NULL OR "maintenance_entries"."total_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_entry_tasks" (
	"entry_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	CONSTRAINT "maintenance_entry_tasks_entry_id_task_id_pk" PRIMARY KEY("entry_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"interval_miles" integer,
	"interval_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_schedules_vehicle_task_uq" UNIQUE("vehicle_id","task_id"),
	CONSTRAINT "maintenance_schedules_at_least_one_interval" CHECK ("maintenance_schedules"."interval_miles" IS NOT NULL OR "maintenance_schedules"."interval_months" IS NOT NULL),
	CONSTRAINT "maintenance_schedules_miles_positive" CHECK ("maintenance_schedules"."interval_miles" IS NULL OR "maintenance_schedules"."interval_miles" > 0),
	CONSTRAINT "maintenance_schedules_months_positive" CHECK ("maintenance_schedules"."interval_months" IS NULL OR "maintenance_schedules"."interval_months" > 0)
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_entries" ADD CONSTRAINT "maintenance_entries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_entry_tasks" ADD CONSTRAINT "maintenance_entry_tasks_entry_id_maintenance_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."maintenance_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_entry_tasks" ADD CONSTRAINT "maintenance_entry_tasks_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicles_user_id_idx" ON "vehicles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fuel_entries_vehicle_date_idx" ON "fuel_entries" USING btree ("vehicle_id","entry_date");--> statement-breakpoint
CREATE INDEX "fuel_entries_vehicle_odometer_idx" ON "fuel_entries" USING btree ("vehicle_id","odometer");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_tasks_system_name_uq" ON "maintenance_tasks" USING btree ("name") WHERE "maintenance_tasks"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_tasks_user_name_uq" ON "maintenance_tasks" USING btree ("user_id","name") WHERE "maintenance_tasks"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "maintenance_entries_vehicle_date_idx" ON "maintenance_entries" USING btree ("vehicle_id","entry_date");--> statement-breakpoint
CREATE INDEX "maintenance_entries_vehicle_odometer_idx" ON "maintenance_entries" USING btree ("vehicle_id","odometer");--> statement-breakpoint
CREATE INDEX "maintenance_entry_tasks_task_idx" ON "maintenance_entry_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_vehicle_idx" ON "maintenance_schedules" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_task_idx" ON "maintenance_schedules" USING btree ("task_id");
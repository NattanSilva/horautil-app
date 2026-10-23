CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'awaiting_confirmation', 'completed', 'declined', 'cancelled_student', 'cancelled_teacher', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('held', 'posted', 'released', 'expired', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('welcome_bonus', 'session_earned', 'session_spent', 'refund', 'penalty', 'adjustment', 'reversal', 'expiry');--> statement-breakpoint
CREATE TYPE "public"."meeting_type" AS ENUM('online', 'in_person', 'external');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('booking_requested', 'booking_accepted', 'booking_declined', 'booking_cancelled', 'booking_completed', 'confirm_completion', 'review_requested', 'credits_expiring', 'system');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."skill_mode" AS ENUM('teach', 'learn');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"username" varchar(60),
	"name" varchar(120) NOT NULL,
	"avatar_url" varchar(500),
	"bio" text,
	"city" varchar(120),
	"timezone" varchar(60) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"suspended_until" timestamp with time zone,
	"late_cancellation_count" smallint DEFAULT 0 NOT NULL,
	"no_show_count" smallint DEFAULT 0 NOT NULL,
	"flagged_review_count" smallint DEFAULT 0 NOT NULL,
	"marketing_consent_at" timestamp with time zone,
	"rating_avg" numeric(3, 2),
	"sessions_as_teacher" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" uuid,
	"icon" varchar(50),
	"search_vector" "tsvector",
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"mode" "skill_mode" NOT NULL,
	"level" "skill_level",
	"priority" smallint DEFAULT 3,
	"description" text,
	CONSTRAINT "user_skills_teach_requires_level" CHECK ("user_skills"."mode" <> 'teach' OR "user_skills"."level" IS NOT NULL),
	CONSTRAINT "user_skills_priority_range" CHECK ("user_skills"."priority" IS NULL OR ("user_skills"."priority" BETWEEN 1 AND 3))
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "availability_weekday_range" CHECK ("availability_slots"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "availability_time_order" CHECK ("availability_slots"."end_time" > "availability_slots"."start_time"),
	CONSTRAINT "availability_30min_alignment" CHECK (EXTRACT(MINUTE FROM "availability_slots"."start_time") % 30 = 0 AND EXTRACT(MINUTE FROM "availability_slots"."end_time") % 30 = 0)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"credits_amount" smallint NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"student_message" text,
	"decline_reason" text,
	"meeting_type" "meeting_type" DEFAULT 'external' NOT NULL,
	"meeting_location" varchar(200),
	"cancelled_by" uuid,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"student_completed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_distinct_participants" CHECK ("bookings"."teacher_id" <> "bookings"."student_id"),
	CONSTRAINT "bookings_duration_valid" CHECK ("bookings"."duration_minutes" >= 30 AND "bookings"."duration_minutes" <= 180 AND "bookings"."duration_minutes" % 30 = 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"type" "entry_type" NOT NULL,
	"minutes" integer NOT NULL,
	"status" "entry_status" DEFAULT 'posted' NOT NULL,
	"expires_at" timestamp with time zone,
	"balance_after" integer NOT NULL,
	"description" varchar(200),
	"idempotency_key" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_minutes_positive" CHECK ("wallet_entries"."minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text NOT NULL,
	"reply_text" text,
	"replied_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"report_count" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_comment_length" CHECK (char_length("reviews"."comment") BETWEEN 10 AND 500),
	CONSTRAINT "reviews_not_self_review" CHECK ("reviews"."reviewer_id" <> "reviews"."reviewee_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(80) NOT NULL,
	"entity" varchar(60) NOT NULL,
	"entity_id" uuid,
	"payload" jsonb,
	"ip" varchar(45),
	"correlation_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"family_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" varchar(40),
	"device_info" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_user_id" uuid,
	"booking_id" uuid,
	"review_id" uuid,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_not_self" CHECK ("user_blocks"."blocker_id" <> "user_blocks"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "idx_users_city" ON "users" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_users_rating" ON "users" USING btree ("rating_avg" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_users_discoverable" ON "users" USING btree ("status") WHERE "users"."onboarding_completed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_categories_parent" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_categories_search" ON "categories" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "user_skills_user_category_mode_unique" ON "user_skills" USING btree ("user_id","category_id","mode");--> statement-breakpoint
CREATE INDEX "idx_user_skills_category_mode" ON "user_skills" USING btree ("category_id","mode");--> statement-breakpoint
CREATE INDEX "idx_user_skills_user_mode" ON "user_skills" USING btree ("user_id","mode");--> statement-breakpoint
CREATE INDEX "idx_availability_user_weekday" ON "availability_slots" USING btree ("user_id","weekday");--> statement-breakpoint
CREATE INDEX "idx_availability_user_active" ON "availability_slots" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "idx_bookings_teacher_time" ON "bookings" USING btree ("teacher_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_student_time" ON "bookings" USING btree ("student_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_status_created" ON "bookings" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_pending_expiry" ON "bookings" USING btree ("expires_at") WHERE "bookings"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_bookings_awaiting_confirmation" ON "bookings" USING btree ("student_completed_at") WHERE "bookings"."status" = 'awaiting_confirmation';--> statement-breakpoint
CREATE INDEX "idx_wallet_user_status" ON "wallet_entries" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_wallet_expiry" ON "wallet_entries" USING btree ("expires_at") WHERE "wallet_entries"."status" = 'posted';--> statement-breakpoint
CREATE INDEX "idx_wallet_booking" ON "wallet_entries" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entries_idempotency_unique" ON "wallet_entries" USING btree ("user_id","idempotency_key") WHERE "wallet_entries"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entries_welcome_bonus_unique" ON "wallet_entries" USING btree ("user_id") WHERE "wallet_entries"."type" = 'welcome_bonus';--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_unique" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewee" ON "reviews" USING btree ("reviewee_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_reviews_rating" ON "reviews" USING btree ("reviewee_id","rating");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_unique" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id") WHERE "refresh_tokens"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expiry" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_reports_target" ON "reports" USING btree ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_unique" ON "user_blocks" USING btree ("blocker_id","blocked_id");
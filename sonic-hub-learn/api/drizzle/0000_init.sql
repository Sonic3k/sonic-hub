CREATE TABLE "chapter" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"parent_id" integer,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_collection" boolean DEFAULT false NOT NULL,
	"source_type" text NOT NULL,
	"source_name" text,
	"source_author" text,
	"source_publisher" text,
	"source_edition" text,
	"source_url" text,
	"algorithm" text DEFAULT 'fsrs' NOT NULL,
	"retention" double precision DEFAULT 0.9 NOT NULL,
	"new_per_day" integer DEFAULT 15 NOT NULL,
	"max_reviews_per_day" integer DEFAULT 200 NOT NULL,
	"new_order" text DEFAULT 'course' NOT NULL,
	"exam_date" date,
	"exam_question_count" integer,
	"exam_minutes" integer,
	"exam_pass_percent" integer,
	"policy_hash" text,
	"status" text DEFAULT 'active' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "course_card" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"facet" text NOT NULL,
	"state" smallint DEFAULT 0 NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision DEFAULT 0 NOT NULL,
	"difficulty" double precision DEFAULT 0 NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone,
	"leech" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_enrollment" (
	"course_id" integer PRIMARY KEY NOT NULL,
	"daily_enabled" boolean DEFAULT true NOT NULL,
	"new_per_day" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_exam_domain" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"weight" double precision NOT NULL,
	"tag_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_facet" (
	"course_id" integer NOT NULL,
	"facet" text NOT NULL,
	CONSTRAINT "course_facet_course_id_facet_pk" PRIMARY KEY("course_id","facet")
);
--> statement-breakpoint
CREATE TABLE "course_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"sort" integer NOT NULL,
	"note_md" text,
	"via" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_tag" (
	"course_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "course_tag_course_id_tag_id_pk" PRIMARY KEY("course_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"front_md" text,
	"back_md" text,
	"pattern" text,
	"image_key" text,
	"audio_key" text,
	"origin_course_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "item_accept" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"text" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_example" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"course_id" integer,
	"text" text NOT NULL,
	"translation" text,
	"audio_key" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_exposure" (
	"item_id" integer PRIMARY KEY NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"seen_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_relation" (
	"item_id" integer NOT NULL,
	"related_item_id" integer NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "item_relation_item_id_related_item_id_type_pk" PRIMARY KEY("item_id","related_item_id","type")
);
--> statement-breakpoint
CREATE TABLE "item_tag" (
	"item_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "item_tag_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "item_vocab" (
	"item_id" integer PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"pronunciation" text,
	"pos" text,
	"meaning" text NOT NULL,
	"definition" text
);
--> statement-breakpoint
CREATE TABLE "lesson" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body_md" text,
	"slides_html" text,
	"video_url" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_item" (
	"lesson_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"sort" integer NOT NULL,
	CONSTRAINT "lesson_item_lesson_id_item_id_pk" PRIMARY KEY("lesson_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"source_sha256" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"storage" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"item_id" integer NOT NULL,
	"course_id" integer,
	"facet" text NOT NULL,
	"type" text NOT NULL,
	"prompt_md" text NOT NULL,
	"back_md" text,
	"explanation_md" text,
	"true_false_answer" boolean,
	"image_key" text,
	"audio_key" text,
	"difficulty" smallint,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "question_answer" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"blank" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_option" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"text_md" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"why_md" text,
	"match_md" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_tag" (
	"question_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "question_tag_question_id_tag_id_pk" PRIMARY KEY("question_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "review_choice" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"review_log_id" bigint NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"question_option_id" integer,
	"matched_option_id" integer,
	"item_id" integer
);
--> statement-breakpoint
CREATE TABLE "review_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"facet" text NOT NULL,
	"rating" smallint NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"mode" text NOT NULL,
	"course_id" integer,
	"session_id" integer,
	"question_id" integer,
	"generator" text,
	"correct" boolean,
	"response_text" text,
	"time_ms" integer,
	"hint_used" boolean DEFAULT false NOT NULL,
	"client_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_log_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "study_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"course_id" integer,
	"day" date,
	"status" text DEFAULT 'active' NOT NULL,
	"seed" integer NOT NULL,
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"score_percent" double precision,
	"passed" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_session_card" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sort" integer NOT NULL,
	"course_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"facet" text NOT NULL,
	"question_id" integer,
	"generator" text,
	"seed" integer NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"requeue_of_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"response_text" text,
	"correct" boolean,
	"rating" smallint,
	"time_ms" integer,
	"hint_used" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone,
	"review_log_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_session_card_choice" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_card_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"question_option_id" integer,
	"matched_option_id" integer,
	"item_id" integer
);
--> statement-breakpoint
CREATE TABLE "study_session_scope" (
	"session_id" integer NOT NULL,
	"scope_type" text NOT NULL,
	"ref_key" text NOT NULL,
	CONSTRAINT "study_session_scope_session_id_scope_type_ref_key_pk" PRIMARY KEY("session_id","scope_type","ref_key")
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"prefix" text NOT NULL,
	"lang" text NOT NULL,
	"description" text,
	"theme_css" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_key_unique" UNIQUE("key"),
	CONSTRAINT "subject_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_parent_id_chapter_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_card" ADD CONSTRAINT "course_card_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_card" ADD CONSTRAINT "course_card_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollment" ADD CONSTRAINT "course_enrollment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_exam_domain" ADD CONSTRAINT "course_exam_domain_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_exam_domain" ADD CONSTRAINT "course_exam_domain_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_facet" ADD CONSTRAINT "course_facet_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_item" ADD CONSTRAINT "course_item_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_item" ADD CONSTRAINT "course_item_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tag" ADD CONSTRAINT "course_tag_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tag" ADD CONSTRAINT "course_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_origin_course_id_course_id_fk" FOREIGN KEY ("origin_course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_accept" ADD CONSTRAINT "item_accept_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_example" ADD CONSTRAINT "item_example_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_example" ADD CONSTRAINT "item_example_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_exposure" ADD CONSTRAINT "item_exposure_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_relation" ADD CONSTRAINT "item_relation_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_relation" ADD CONSTRAINT "item_relation_related_item_id_item_id_fk" FOREIGN KEY ("related_item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_vocab" ADD CONSTRAINT "item_vocab_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_chapter_id_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_item" ADD CONSTRAINT "lesson_item_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_item" ADD CONSTRAINT "lesson_item_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answer" ADD CONSTRAINT "question_answer_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tag" ADD CONSTRAINT "question_tag_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tag" ADD CONSTRAINT "question_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_choice" ADD CONSTRAINT "review_choice_review_log_id_review_log_id_fk" FOREIGN KEY ("review_log_id") REFERENCES "public"."review_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_choice" ADD CONSTRAINT "review_choice_question_option_id_question_option_id_fk" FOREIGN KEY ("question_option_id") REFERENCES "public"."question_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_choice" ADD CONSTRAINT "review_choice_matched_option_id_question_option_id_fk" FOREIGN KEY ("matched_option_id") REFERENCES "public"."question_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_choice" ADD CONSTRAINT "review_choice_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_session_id_study_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session" ADD CONSTRAINT "study_session_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card" ADD CONSTRAINT "study_session_card_session_id_study_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card" ADD CONSTRAINT "study_session_card_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card" ADD CONSTRAINT "study_session_card_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card" ADD CONSTRAINT "study_session_card_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card" ADD CONSTRAINT "study_session_card_requeue_of_id_study_session_card_id_fk" FOREIGN KEY ("requeue_of_id") REFERENCES "public"."study_session_card"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card" ADD CONSTRAINT "study_session_card_review_log_id_review_log_id_fk" FOREIGN KEY ("review_log_id") REFERENCES "public"."review_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card_choice" ADD CONSTRAINT "study_session_card_choice_session_card_id_study_session_card_id_fk" FOREIGN KEY ("session_card_id") REFERENCES "public"."study_session_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card_choice" ADD CONSTRAINT "study_session_card_choice_question_option_id_question_option_id_fk" FOREIGN KEY ("question_option_id") REFERENCES "public"."question_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card_choice" ADD CONSTRAINT "study_session_card_choice_matched_option_id_question_option_id_fk" FOREIGN KEY ("matched_option_id") REFERENCES "public"."question_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_card_choice" ADD CONSTRAINT "study_session_card_choice_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_scope" ADD CONSTRAINT "study_session_scope_session_id_study_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_course_key_uq" ON "chapter" USING btree ("course_id","key");--> statement-breakpoint
CREATE INDEX "course_subject_idx" ON "course" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_card_uq" ON "course_card" USING btree ("course_id","item_id","facet");--> statement-breakpoint
CREATE INDEX "course_card_due_idx" ON "course_card" USING btree ("course_id","state","due");--> statement-breakpoint
CREATE INDEX "course_card_item_idx" ON "course_card" USING btree ("item_id","facet");--> statement-breakpoint
CREATE UNIQUE INDEX "course_exam_domain_uq" ON "course_exam_domain" USING btree ("course_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "course_item_uq" ON "course_item" USING btree ("course_id","item_id");--> statement-breakpoint
CREATE INDEX "course_item_item_idx" ON "course_item" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_subject_kind_idx" ON "item" USING btree ("subject_id","kind");--> statement-breakpoint
CREATE INDEX "item_accept_item_idx" ON "item_accept" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_example_item_idx" ON "item_example" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_tag_tag_idx" ON "item_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "item_vocab_term_idx" ON "item_vocab" USING btree (lower("term"));--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_course_key_uq" ON "lesson" USING btree ("course_id","key");--> statement-breakpoint
CREATE INDEX "lesson_chapter_idx" ON "lesson" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "lesson_item_item_idx" ON "lesson_item" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "question_item_facet_idx" ON "question" USING btree ("item_id","facet");--> statement-breakpoint
CREATE INDEX "question_answer_question_idx" ON "question_answer" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_option_text_uq" ON "question_option" USING btree ("question_id",md5("text_md"));--> statement-breakpoint
CREATE INDEX "question_tag_tag_idx" ON "question_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "review_choice_log_idx" ON "review_choice" USING btree ("review_log_id");--> statement-breakpoint
CREATE INDEX "review_choice_option_idx" ON "review_choice" USING btree ("question_option_id");--> statement-breakpoint
CREATE INDEX "review_log_item_facet_idx" ON "review_log" USING btree ("item_id","facet","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_log_time_idx" ON "review_log" USING btree ("reviewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_session_daily_uq" ON "study_session" USING btree ("day",coalesce("course_id", 0)) WHERE "study_session"."mode" = 'daily';--> statement-breakpoint
CREATE INDEX "study_session_card_session_idx" ON "study_session_card" USING btree ("session_id","sort");--> statement-breakpoint
CREATE INDEX "study_session_card_choice_card_idx" ON "study_session_card_choice" USING btree ("session_card_id");
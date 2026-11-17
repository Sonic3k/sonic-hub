CREATE TABLE "holder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY NOT NULL,
	"holder_id" uuid NOT NULL,
	"game" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_version_positive" CHECK ("player"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holder_code_hash_key" ON "holder" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "player_holder_game_idx" ON "player" USING btree ("holder_id","game");
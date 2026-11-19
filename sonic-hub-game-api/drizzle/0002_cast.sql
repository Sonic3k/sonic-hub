-- A game's cast: the names and pictures its characters are given here in place of the game's own, and the copies of each picture.
CREATE TABLE "cast_member" (
	"game" text NOT NULL,
	"member" text NOT NULL,
	"name" text,
	"photo_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cast_member_game_member_pk" PRIMARY KEY("game","member"),
	CONSTRAINT "cast_member_has_something" CHECK ("cast_member"."name" is not null or "cast_member"."photo_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "cast_photo" (
	"game" text NOT NULL,
	"member" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	CONSTRAINT "cast_photo_game_member_width_pk" PRIMARY KEY("game","member","width")
);
--> statement-breakpoint
ALTER TABLE "cast_photo" ADD CONSTRAINT "cast_photo_member_fk" FOREIGN KEY ("game","member") REFERENCES "public"."cast_member"("game","member") ON DELETE cascade ON UPDATE no action;
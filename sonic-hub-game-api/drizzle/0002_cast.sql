-- A game's cast: the names its characters are given here in place of the game's own, and the key each one's picture is kept under in the hub's bucket.
CREATE TABLE "cast_member" (
	"game" text NOT NULL,
	"member" text NOT NULL,
	"name" text,
	"photo_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cast_member_game_member_pk" PRIMARY KEY("game","member"),
	CONSTRAINT "cast_member_has_something" CHECK ("cast_member"."name" is not null or "cast_member"."photo_key" is not null)
);

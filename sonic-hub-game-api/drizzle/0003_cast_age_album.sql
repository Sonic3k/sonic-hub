-- A cast member can be given an age (an adult's), and her album its pictures: one row a picture, by its place.
CREATE TABLE "cast_album" (
	"game" text NOT NULL,
	"member" text NOT NULL,
	"n" integer NOT NULL,
	"photo_key" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cast_album_game_member_n_pk" PRIMARY KEY("game","member","n"),
	CONSTRAINT "cast_album_place" CHECK ("cast_album"."n" between 1 and 99)
);
--> statement-breakpoint
ALTER TABLE "cast_member" DROP CONSTRAINT "cast_member_has_something";--> statement-breakpoint
ALTER TABLE "cast_member" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "cast_member" ADD CONSTRAINT "cast_member_age_adult" CHECK ("cast_member"."age" is null or "cast_member"."age" between 18 and 99);--> statement-breakpoint
ALTER TABLE "cast_member" ADD CONSTRAINT "cast_member_has_something" CHECK ("cast_member"."name" is not null or "cast_member"."photo_key" is not null or "cast_member"."age" is not null);
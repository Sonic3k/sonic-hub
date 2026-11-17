-- Players become the game's own: no holder, no code. Whoever was kept under a code stays, as a player of the game.
ALTER TABLE "player" DROP CONSTRAINT "player_holder_id_holder_id_fk";--> statement-breakpoint
DROP INDEX "player_holder_game_idx";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "holder_id";--> statement-breakpoint
DROP TABLE "holder";--> statement-breakpoint
CREATE INDEX "player_game_idx" ON "player" USING btree ("game");--> statement-breakpoint
CREATE TABLE "service" (
	"one" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"epoch" uuid DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "service_one_row" CHECK ("service"."one")
);
--> statement-breakpoint
INSERT INTO "service" DEFAULT VALUES;

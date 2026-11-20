-- The games picked out on the shelf: one row a game, with the moment it was picked.
CREATE TABLE "highlight" (
	"game" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

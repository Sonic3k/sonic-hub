# Rules for anyone, human or AI, who changes this repo

## angels-islands-api: a read never costs a statement per row

Every `/api` answer carries the header `X-Sql-Count`: how many SQL statements that request sent. A GET above 50
is written to the log as a warning. (config/SqlCountingDataSource, SqlCountFilter, SqlCountAdvice)

- **Measure before you merge.** When you add or change a GET endpoint, call it and read the header
  (`curl -si <url> | grep -i x-sql-count`). A list stays at a handful of statements whatever its length. A count
  that grows with the rows means something is fetched row by row: fix that first. Put the number in the PR.
- `python3 angels-islands-api/tools/sql-sweep.py <base-url>` calls every read in `tools/sql-sweep.paths` and prints
  its count; it fails when one is above 50. Add your endpoint to that file.
- **Lists send no relations unless asked** — the `incl*` query parameters (`MediaFileDto.Includes`,
  `CollectionService.Includes`, `MemoryDto.Includes`). A new list follows the same pattern, and each consumer passes
  only the flags for what it shows. A single-item GET may come whole.
- No query (repository, JdbcTemplate, EntityManager) inside a loop or a per-item `map`: read for the whole list in
  one statement and look the rows up in a map.
- Never map the inverse side of a one-to-one (`@OneToOne(mappedBy = …)`): Hibernate loads it with every row of the
  owner, lazy or not. See the note on the detail tables in `MediaFile`.
- A form that writes links back (the admin's memory editor) starts from the single-item GET, never from a list's
  copy: a list carries only the links it asked for.

## Consumers of the API

The web (`sonic-hub-web`), the admin (`angels-islands-admin`) and the import scripts (`sonic-hub-pages`) read these
lists. When a list's answer changes, change them in the same PR.

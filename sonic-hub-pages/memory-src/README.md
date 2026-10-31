# memory-src

Source of the 1990–2007 memory written into Angels Islands (and of the demo data `assets/memory-1990-2008.json`).

- `memories_src.py` — chapters, memories, threads and facts written by hand (all DRAFT until confirmed). Photos are referenced as (album name, file name[, parent album]).
- `trips_src.py` / `trips.json` — every trip found in the archive, with stops and coordinates.
- `transcripts/` — text read from the scans: school papers, game notebooks, the bus route notebook, plus the 1990–2007 media tree used to resolve photo ids.
- `build.py` — resolves photo references to media ids and writes `../assets/memory-1990-2008.json`.

- `push_to_hub.py` — writes chapters, episodes (with photos, albums, tags, people) and facts to the self person under source `era1990`, plus captions/tags on document scans. Dry run by default, `--apply` writes.
- `apply_captions.py` — the short captions for the 1990–2007 photos (`transcripts/photo-captions-1990-2007.json`); only photos with an empty caption get one.
- `tag_persons.py` — family members on photos, only from the owner's own captions and the album "Anh cua Jun".

Run (from this folder): `python3 build.py && python3 push_to_hub.py --apply`

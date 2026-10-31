# memory-src

Source of the Memories demo data (`assets/memory-1990-2008.json`) and the input for the future import into Angels Islands.

- `memories_src.py` — chapters, memories, threads and facts written by hand (all DRAFT until confirmed). Photos are referenced as (album name, file name[, parent album]).
- `trips_src.py` / `trips.json` — every trip found in the archive, with stops and coordinates.
- `transcripts/` — text read from the scans: school papers, game notebooks, the bus route notebook, plus the 1990–2007 media tree used to resolve photo ids.
- `build.py` — resolves photo references to media ids and writes `../assets/memory-1990-2008.json`.

Run: `python3 sonic-hub-pages/memory-src/build.py`

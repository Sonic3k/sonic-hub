#!/bin/bash
# from the results to the checked workbook
# RECALC: the path of a script that has LibreOffice compute the formulas (python3 $RECALC file.xlsx); without it the
# workbook is written with its formulas and no values, and the last check is left out
set -e
cd "$(dirname "$0")/.."
R=${1:-out/results.jsonl}; X=${2:-commander-chess-league.xlsx}
node tools/verify.js $R --json | tail -3
node tools/standings.js $R --json > out/standings.json
node tools/notes.js $R > out/notes.json
python3 -I tools/build_xlsx.py $R out/standings.json $X out/notes.json
if [ -n "$RECALC" ]; then python3 "$RECALC" "$PWD/$X" 180 && python3 -I tools/check_xlsx.py $X $R out/standings.json; fi

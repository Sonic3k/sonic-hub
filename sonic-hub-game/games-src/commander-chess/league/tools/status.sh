#!/bin/bash
# one line on how the league is doing; starts the runner again if it has stopped with games left
cd "$(dirname "$0")/.."
done=$(wc -l < out/results.jsonl); alive=$(pgrep -f "tools/run.js" | head -1)
faults=$(grep -c '"why":"fault"' out/results.jsonl); failed=0; [ -f out/results.failed.jsonl ] && failed=$(wc -l < out/results.failed.jsonl)
eta=$(grep -o '"etaHours":[0-9.]*' out/results.progress.json | cut -d: -f2)
echo "$(date -u +%H:%M) done $done/1518, eta ${eta}h, forfeits $faults, no-result $failed, runner ${alive:-STOPPED}"
if [ -z "$alive" ] && [ "$done" -lt 1518 ]; then (setsid nohup node tools/run.js >> logs/league.out 2>&1 &); sleep 2; echo "runner started again: $(pgrep -f tools/run.js | head -1)"; fi

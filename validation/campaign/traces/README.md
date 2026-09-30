# Development proofs

`level-0002.json` is a solver-produced proof bundle containing the exact authored
lesson definition and its booster-free winning trace. It is not release chapter
content and is never imported by the app. `report.json` in the parent directory
explicitly reports lesson-fixture scope; it does not certify the 1,000-level catalog.

Run tools from `sliding-stars-next` using the existing Node/Vite dependencies:

```powershell
node scripts/campaign/solve.mts --lesson 2 --maxNodes 3000 --maxDepth 2 --maxMilliseconds 15000 --out validation/campaign/traces/level-0002.json
node scripts/campaign/replay.mts --input validation/campaign/traces/level-0002.json
node scripts/campaign/validate.mts --input path/to/level.json --trace path/to/trace.json
node scripts/campaign/report.mts --lessons --out validation/campaign/report.json
node scripts/campaign/validate.mts --release src/campaign/content --traces validation/campaign/traces
node scripts/campaign/audit-bundle.mts
```

All four commands support `--help` and `--out`. Input can be one level definition,
one `{level, trace}` bundle, or an array (solve requires one level). Replay requires
a trace. `--lesson ID` selects a fixed authored fixture; replay uses its committed
trace while solve/validate/report search it. `--lessons` replays the committed
lesson proofs. Explicit `--trace` overrides an input bundle's trace.

Search limits default to 10,000 attempted transitions, depth 20 and 10,000 ms.
All are finite nonnegative integers, exposed as `--maxNodes`, `--maxDepth` and
`--maxMilliseconds`. Attempted transitions include results discarded by complete
state transposition deduplication. Heuristic ordering is deterministic but does
not guarantee a shortest solution. All budget cutoffs, including depth, produce
`timeout`, which remains unresolved. `exhausted` means only that the reachable
frontier was fully searched; it also fails release admission. Time is checked
around synchronous engine calls, which cannot be interrupted mid-call.

Successful solving and validation serialize proofs and launch a fresh Node
process to replay using shipped rules. The child has a 60-second process limit;
failure, timeout, schema errors, rejected/extra actions, boosters, hash mismatches
or non-winning final states fail validation. Output includes the child PID.

Release mode requires all 20 exact 50-level chapters and proof files named
`level-0001.json` through `level-1000.json` (trace objects or bundles). Missing or
empty chapters and missing proofs are errors. There is no generation fallback.
Exit code 0 means the requested scope passed; exit code 1 means invalid,
unresolved, incomplete or an operational error. Tools do not edit the catalog.

`audit-bundle.mts` performs a real production Vite build in memory and checks the
entire loaded module graph and emitted chunks for development solver/trace code.
The normal app build still verifies packaged offline output separately.

# Verification

## Impact and ownership

GitNexus refreshed before source edits. init/update upstream impact LOW (one
direct CLI caller each); createWorkflowStructure, collectTemplateFiles and
analyzeChanges LOW (two upstream symbols each; update collection/classification
participate in the update flow). Unresolved `update` call sites were also
checked by source search, including unrelated crypto/hash method calls.

The new helper adds only the local-hook rule. The confirmed template/dogfood
gitignore pair is synchronized. No Python, dependency, event, installer, archived
task, unrelated ignore pattern or whole linked-workflow policy is changed.

## Local results

- Initial regression run before product edits: five failures and one baseline
  pass. The six-case integration run then passed with the fix.
- Affected-source run: 125 passed across existing init/update integration and
  the first new integration/unit cases; no new skip.
- Final new suite: 17/17 (eight integration and nine unit tests), including
  real Windows live/dangling workflow junctions, external ignore-leaf junctions
  for init/update, controlled file-link lstat boundaries and nonregular targets.
- Full lint, typecheck, build, Prettier and diff checks passed.
- Built CI smoke passed on Windows/Node 26.7 with real CPython 3.9.25 via uv.
- Template/root `.gitignore` byte hashes matched.
- Independent check: no code blockers. Corrected one prose stage count; 17/17
  focused tests, lint, typecheck, strict TypeScript including both new test files
  (zero diagnostics), Prettier and diff checks passed independently.
- Full pre-commit: pending implementation commit.

Assertions include actual Git check-ignore behavior, repeated init/update bytes,
BOM/CRLF/comments and later negations, force-reinit preservation, tracked advice
with exact index bytes, and skip-before-read/dry-run directory snapshots.

# Doctor local acceptance

The user's latest 2026-11-11 instruction requires local completion without
further publication. The PRD now accepts the completed local doctor checks
and existing matrix inclusion. The original hosted execution gate is outside
this round, not relabeled passing.

Product implementation remainse7583d64 with its exact prior CRITICAL approval.
No doctor collector/probe/CLI wiring, schema, canonical reader, project hook,
user configuration, timeout, concurrency or skip changes are made here.
The archive commit still receives its normal full gate and staged GitNexus
inspection; previous approval does not authorize new product-symbol edits.

Reused receipts: independent doctor34 + platforms3 =37 passing cases; lint,
typecheck, strict new-test TypeScript, Python3.9 compile/typecheck, build and
package checks; five real built-CLI Node18.17 cases and three schema rejection
controls; fixture/Git byte snapshots and the historical real-checkout snapshot.
These remain the observations in verification-20261111.md,
independent-check-20261111.md and node18-smoke-20261111.md, not new runs.
The latest normal full pre-commit at6c700c84 passed core401/2 existing skips
and CLI2239/35 existing skips, including doctor34. No source input changed.

Historical real-checkout exit1 correctly identified the missing owned OpenCode
asset; no repair or claim of a healthy user configuration is made. Doctor's
confidence remains at most probed. No historical receipt is consumed by doctor,
and no verification-receipt feature or native/model call is introduced.

PR runs43022012893 and43023805660 failed Checkout on the unavailable marketplace
gitlink, before doctor tests ran. Hosted Windows/Linux doctor execution remains
not_run. No marketplace fork, submodule URL repair or further remote write is
performed under the local-only instruction. Future hosted/public use still
requires a separately authorized distribution repair and actual execution.

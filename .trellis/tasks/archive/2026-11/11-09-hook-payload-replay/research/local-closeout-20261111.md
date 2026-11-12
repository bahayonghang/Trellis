# Payload replay local acceptance

The user's latest 2026-11-11 instruction requests local completion without
further publication. The PRD now accepts local Windows replay and existing
Linux/Windows matrix inclusion; actual hosted execution is outside this round.
It is not relabeled passing.

Implementation isd7cb0fc0, with its preserved #644 attribution. Reuse the56
replay cases,161 related regressions, five real temporary-hook mutation controls,
seven sanitized captures and independent-review evidence already recorded in
verification-20261111.md and independent-check-20261111.md. The56-case suite
also passed in the later normal full gates, including the latest Windows CI
archive gate at2d4efc93 (core401/2 existing skips, CLI2239/35 existing skips).
No replay hook/configuration, capture, oracle, timeout, concurrency or skip is
changed for this acceptance update. The archive commit runs its own normal gate.

PR runs43022012893 and43023805660 failed Checkout on the marketplace gitlink,
before this suite ran. Hosted Linux/Windows replay remains not_run. No new
fork, remote branch, host session or model call is made for local closeout.

Local replay proves actual context/envelope assertions for the saved and
explicitly derived inputs. It does not prove native Claude delivery. Captured
Codex0.167.1 default-role input remains default; Trellis-role variants remain
derived, and native Codex delivery evidence remains a separate prior receipt.

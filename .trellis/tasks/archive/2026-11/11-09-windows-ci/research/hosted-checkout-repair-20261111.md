# Hosted checkout follow-up — 2026-11-11

The historical local-only closeout remains unchanged. A separately approved task `11-11-hosted-ci-marketplace` has now repaired public input distribution.

Published existing marketplace commit `1aa9b326baf93257d6142660e49d3120e7f4b4ef` without content changes to `bahayonghang/marketplace`, branch `trellis-reliability-v1`. Commit API and fresh bare HTTPS fetch both succeeded. Trellis commit `c3c08559bcef98f0dfdf84f24a22d7a4de5fec6f` changes one `.gitmodules` URL to that fork, preserving gitlink, child contents, docs-site URL and recursive checkout. It was normally pushed with the explicitly approved eight preceding dev commits.

## Actual new runs

- PR #1: https://github.com/bahayonghang/Trellis/actions/runs/43139663032
- dev: https://github.com/bahayonghang/Trellis/actions/runs/43139653388
- Source head: `c3c08559bcef98f0dfdf84f24a22d7a4de5fec6f`.
- Actual PR merge: `fbbdd12d6ed80f895b88b68ced9aa86e48c90a2e`.

| Matrix job | PR job ID | dev job ID | Checkout in both |
| --- | --- | --- | --- |
| Ubuntu / Node 18.17.0 | 130923309644 | 130923278704 | success |
| Ubuntu / Node 26.7.0 | 130923309648 | 130923278692 | success |
| Windows / Node 18.17.0 | 130923309176 | 130923278194 | success |
| Windows / Node 26.7.0 | 130923309508 | 130923278624 | success |

All eight full logs positively show checkout of the exact original marketplace SHA, and none contains `not our ref 1aa9b326`. The new task's `research/hosted-job-evidence-20261111.json` preserves timestamped lines, job URLs, step outcomes, raw-log paths and hashes; `research/hosted-verification-20261111.md` records commands and local gates.

Whole runs remain failure after Checkout: Ubuntu Python3.9 is unavailable for the actual Ubuntu26.04 runner, and Windows Node26 core testing hits a native fs-event assertion/worker crash. Windows Node18 job and CLI smoke pass. These downstream findings belong to `11-09-fork-reliability-v1/research/hosted-post-checkout-failures-20261111.md`; they were not fixed or hidden in this distribution repair.

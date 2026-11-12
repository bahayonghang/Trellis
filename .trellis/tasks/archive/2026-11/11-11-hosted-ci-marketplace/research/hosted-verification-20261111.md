# Hosted checkout repair — verification receipt

## Scope and authorization

User approved the final task plan on 2026-11-11, including normal publication of the existing eight local dev commits. Initial HEAD was `f5a7941169e72e1b6a4a6c670ac5be7d627c4e35`; initial remote dev was `9cc2f58e6c2103727dc0f448f9bef7f2920b638d`. The baseline lists the exact range. No upstream write, force push, gitlink/content rollback, recursive-checkout removal or test workaround is authorized.

## Remote object publication — PASS

The fork metadata API initially returned HTTP 404. Installed gh rejected the supplied command `gh repo fork mindfold-ai/marketplace --clone=false --remote=false` because `--remote` is unsupported with an explicit repository argument; this attempt made no fork. Following the installed command's usage, ran `gh repo fork mindfold-ai/marketplace --clone=false`, which created https://github.com/bahayonghang/marketplace . Main and marketplace local remotes remained unchanged.

Published the existing object without content changes:

```text
git -C marketplace -c push.followTags=false push https://github.com/bahayonghang/marketplace.git 1aa9b326baf93257d6142660e49d3120e7f4b4ef:refs/heads/trellis-reliability-v1
[new branch] 1aa9b326baf93257d6142660e49d3120e7f4b4ef -> trellis-reliability-v1
```

`gh api repos/bahayonghang/marketplace/commits/1aa9b326baf93257d6142660e49d3120e7f4b4ef` returned accurate SHA and https://github.com/bahayonghang/marketplace/commit/1aa9b326baf93257d6142660e49d3120e7f4b4ef . `git ls-remote` advertised the same SHA on the named branch.

Initialized a fresh bare repository at `C:/Users/lyh/AppData/Local/Temp/trellis-marketplace-fetch-6dddad554e3847f284e4745bc73ed850`, fetched the exact SHA over HTTPS from the personal fork, and verified `FETCH_HEAD` equals `1aa9b326baf93257d6142660e49d3120e7f4b4ef`, object type `commit`. No local reference/alternates/object reuse was configured. Exit status 0. This proves fresh remote fetch, independently of the pre-existing marketplace checkout.

## Main-repository review — PASS

Implement and independent check agents confirmed the only product configuration diff is one marketplace URL line. HEAD/index gitlink and marketplace HEAD remain the exact original SHA, marketplace porcelain status is empty, docs-site URL and both workflow files are unchanged. Independent reviewer confirmed the API and probe objects; `pnpm typecheck` and `rtk bypass pnpm lint` passed. No source symbols changed, so symbol impact is not applicable. Spec-sync review found no new implementation contract requiring a spec change; existing/new research records retain the reachability requirement.

GitNexus initial wrapper-based refresh failed while computing dependency runtime identity. Direct invocation of the same installed 1.6.12 artifact completed an `analyze --index-only` refresh without tracked guide/skill writes. Its FTS extension is unavailable on this Windows installation; graph indexing succeeded. Staged detect_changes remains required before commit.

## Commit and publication — PASS

Normal hook completed successfully with fresh TEMP root `C:/Users/lyh/AppData/Local/Temp/trellis-checkout-commit-546c53d9cd7f4a80a7056786446ecc5b`; its `commit.log` retains raw output. Core: 401 passed / 2 existing skips. CLI: 2270 passed / 35 existing skips, 98 files passed / 1 skipped, 262.83 seconds. Commit `c3c08559bcef98f0dfdf84f24a22d7a4de5fec6f` contains the one-line URL replacement and task records. Staged detect_changes reported 10 changed files with no overlapping indexed symbols; staged diff whitespace check passed.

Fetched origin immediately before normal push: HEAD was 9 ahead / 0 behind origin/dev (the approved eight existing commits plus this fix). Ran `git -c push.followTags=false push origin dev:dev`; remote moved from `9cc2f58e` to `c3c08559`, with no force push or upstream write. Both push and PR events triggered new CI runs despite `.gitmodules` being absent from the paths list; existing source changes in this published range supplied the trigger.

## Hosted result — PASS for checkout, both runs completed

- dev push: https://github.com/bahayonghang/Trellis/actions/runs/43139653388
- PR #1: https://github.com/bahayonghang/Trellis/actions/runs/43139663032
- Both source heads: `c3c08559bcef98f0dfdf84f24a22d7a4de5fec6f`.
- PR actual synthetic merge checked out: `fbbdd12d6ed80f895b88b68ced9aa86e48c90a2e` (job 130923309648 log, `git log -1 --format=%H`).
- GitHub job-step API reports all four Checkout steps success in both runs. Downloaded all eight full job logs after completion; each positively shows `Submodule path 'marketplace': checked out '1aa9b326baf93257d6142660e49d3120e7f4b4ef'`, and none contains `not our ref 1aa9b326`. Exact timestamped excerpts, job URLs/IDs, step outcomes, failed later steps, local log paths and SHA256 hashes are preserved in `hosted-job-evidence-20261111.json`.
- While Windows jobs were unfinished, their job-log endpoint returned 404. After completion the installed gh required `--allow-escape-sequences` to save their ANSI-bearing logs; logs were saved to files and only relevant text was inspected.

| Matrix job | PR job | dev job | Checkout in both | Later job result in both |
| --- | --- | --- | --- | --- |
| Ubuntu / Node 18.17.0 | 130923309644 | 130923278704 | success | Python setup failure |
| Ubuntu / Node 26.7.0 | 130923309648 | 130923278692 | success | Python setup failure |
| Windows / Node 18.17.0 | 130923309176 | 130923278194 | success | success, including CLI smoke |
| Windows / Node 26.7.0 | 130923309508 | 130923278624 | success | native assertion during core tests |

Ubuntu jobs failed later at Setup minimum supported Python: `The version '3.9' with architecture 'x64' was not found for Ubuntu 26.04.` No hosted product test ran in those rows. This is a separate runner/Python distribution problem; no workaround is applied in this task.

Both Windows Node26 jobs failed during `Test (core + cli)` with `Assertion failed: !_wcsnicmp(filename, dir, dirlen), file src\win\fs-event.c, line 72`, followed by Vitest worker unexpected exit. PR core summary: 400 passed / 2 skipped, 20 of 21 files passed, 1 unhandled error. CLI tests and smoke were not reached in these rows. The exact native trigger/root cause remains uninvestigated; do not assign it to a product defect or infer a fix from this log alone.

Both whole runs are failure because of these downstream steps. This task's acceptance is fulfilled specifically by remote SHA readability/fresh fetch, preserved content and eight successful hosted recursive checkouts. Follow-up details are recorded in the archived fork-reliability-v1 research. No hosted green-matrix claim is made.

## Local commit gate diagnostics

The first normal commit attempt exited 1 without creating a commit; captured streaming output lacked the final failure summary, so its specific cause is unknown. Re-ran the unchanged normal hook with raw output saved at `C:/Users/lyh/AppData/Local/Temp/trellis-hosted-checkout-commit-20261111.log`. Core passed 401 with 2 existing skips. CLI passed 2269, failed 1, retained 35 existing skips (285.41 seconds).

That failure was fixture setup at `packages/cli/test/regression.test.ts:8473-8481`: the issue-399.1 test creates a fixed sibling `Temp/origin-bare.git`, whose existing main caused `git push -q origin main` to be rejected (fetch first). It targets a local fixture, not any hosted repository. The archived verification-receipts `research/implementation-20261111.md` already records this same fixture issue and process-local fresh TEMP isolation.

Read the owning code, then ran unchanged `vitest run test/regression.test.ts -t issue-399.1` under uv's locked environment with TEMP/TMP/TMPDIR all set to a fresh owned directory `C:/Users/lyh/AppData/Local/Temp/trellis-checkout-control-07c2054f9eeb4a56b154b16c8bcb4592`. All 3 matching cases passed; 504 other cases were filtered by this targeted control. Subsequent complete normal commit gates use a different fresh Temp root each time. No old fixture deletion, product/test modification, skip addition, timeout/concurrency adjustment or hook bypass is used.

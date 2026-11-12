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

## Hosted result

Pending URL-change review, normal commit gate, dev publication and four-job hosted evidence. Remote-object publication alone is not hosted acceptance.

## Local commit gate diagnostics

The first normal commit attempt exited 1 without creating a commit; captured streaming output lacked the final failure summary, so its specific cause is unknown. Re-ran the unchanged normal hook with raw output saved at `C:/Users/lyh/AppData/Local/Temp/trellis-hosted-checkout-commit-20261111.log`. Core passed 401 with 2 existing skips. CLI passed 2269, failed 1, retained 35 existing skips (285.41 seconds).

That failure was fixture setup at `packages/cli/test/regression.test.ts:8473-8481`: the issue-399.1 test creates a fixed sibling `Temp/origin-bare.git`, whose existing main caused `git push -q origin main` to be rejected (fetch first). It targets a local fixture, not any hosted repository. The archived verification-receipts `research/implementation-20261111.md` already records this same fixture issue and process-local fresh TEMP isolation.

Read the owning code, then ran unchanged `vitest run test/regression.test.ts -t issue-399.1` under uv's locked environment with TEMP/TMP/TMPDIR all set to a fresh owned directory `C:/Users/lyh/AppData/Local/Temp/trellis-checkout-control-07c2054f9eeb4a56b154b16c8bcb4592`. All 3 matching cases passed; 504 other cases were filtered by this targeted control. Subsequent complete normal commit gates use a different fresh Temp root each time. No old fixture deletion, product/test modification, skip addition, timeout/concurrency adjustment or hook bypass is used.

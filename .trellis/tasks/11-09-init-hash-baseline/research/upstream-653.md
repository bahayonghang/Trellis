# Selective port review: mindfold-ai/Trellis#653

Reviewed with `gh pr view 653 --repo mindfold-ai/Trellis --json number,title,body,author,state,baseRefName,headRefName,url,files` and `gh pr diff 653 --repo mindfold-ai/Trellis` on 2026-11-10. Default `gh pr view` requests organization fields denied by the current token; explicit fields work without auth changes.

- Author: Huanyi Xie (`xiehuanyi`). Open PR, base `main`, head `fix/preserve-init-hash-baselines`.
- URL: https://github.com/mindfold-ai/Trellis/pull/653; fixes #620.
- Files: template-hash.ts, unit/integration tests, migrations spec. No wholesale merge/cherry-pick.
- Accepted change: fresh init retains recursive `.trellis/` walk. Merge filters recorded workflow paths through existing exclusions, so untouched config/workflow/scripts retain their stored baselines or deliberate lack of one.
- Retain tracking of newly written platform assets and existing platform hashes.
- Port upstream seven regression cases (three parameterized baseline cases, empty merge/untracked case, written/excluded paths case, two init integration cases) selectively. Add task-required init → edit → add platform → update dry-run and create-new assertions; upstream tests alone do not cover the actual update report/write behavior.
- No API signature, template or dogfood changes required. Update InitializeHashesOptions/JSDoc and replace outdated `.trellis/` walk exemption in migrations.md.
- Run new regressions against unfixed source first, then implement. Never use force to bypass the reported add-platform entry path.

## Pre-edit blast radius

`initializeHashes` upstream impact after full index rebuild: LOW, two direct product callers (`handleReinit`, `init`), three impacted symbols, one grouped process. `rg` confirms only those two product call sites. Context additionally lists template-hash/platform configurator tests. Only initializeHashes and its options comments need product edits.

GitNexus 1.6.12 incremental refresh produced malformed symbol/flow attribution in this environment. `analyze --force --index-only` restored exact IDs and expected callers; use forced refresh rather than trusting those malformed results. Generated index is ignored and project instruction/dependency files remain unchanged.

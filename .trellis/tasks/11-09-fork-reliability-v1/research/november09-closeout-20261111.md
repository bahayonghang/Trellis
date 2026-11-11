# November 9 task closeout: additional verification

## Request and source

The user requested the two retained Temp paths, completion of remaining tests,
and as much November 9 task submission/archival as actual acceptance permits.
Source HEAD before this additional verification was
`9b8122d8b077cb51e9f0d520a60d6f6b9c4263e3`, on clean local dev. No product code,
existing skip, timeout, concurrency setting or runtime dependency was changed.

The actual parent children array was audited against exactly one active or
November archive task.json per child. Eleven children are completed/archived:
fork-baseline, init-hash-baseline, archive-commit-scope, hook-trellis-root,
codex-subdir-hooks, task-create-keep-active, hook-stdin-guard, codex-crlf-config,
hooks-local-gitignore, upgrade-linked-guard and windows-test-failures. None was
reopened or modified. The remaining children are windows-ci, hook-payload-replay
and doctor-command, all in_progress with remote CI acceptance unchecked.

A broad historical scan encountered old template-like task.json documents that
do not parse as JSON; failed parses were not accepted as inventory evidence.
The exact parent-child audit above supersedes that unsuccessful scan. Unrelated
old archives and the two protected June tasks were not changed.

## Additional test result

Actual pinned Node18.17.0 was started through an ephemeral tool-cache runtime:
`uv run --locked pnpm --allow-build=node dlx node@18.17.0 ...`.
This added no repository/global dependency and retained CPython3.9.25.

The real built doctor CLI and packaged strict schema passed healthy, missing
workflow, broken recognized hook, stale selected task and no-identity/expired
ticket cases. Three invalid schema controls were rejected. Full fixture/Git
snapshots were identical before/after each run and confidence stayed at most
probed. This closes the previous local Node18 doctor smoke gap. See the
[independent receipt](../../11-09-doctor-command/research/node18-smoke-20261111.md).

Earlier source/full gates and actual Codex0.167.1 Windows integration evidence
remain in [the preceding checkpoint](continuation-20261111-native.md) and
[the four-step integration receipt](windows-integration-20261111.md); they were
not rerun or relabeled as new host/CI evidence.

## CI and archive boundary

The GitHub connector read of the fork's dev workflow returned 404 with
`No commit found for the ref dev`. The local workflow has push/pull_request
triggers for main/dev and no workflow_dispatch entry. No remote workflow run was
started and no local container result is being substituted for hosted CI.

Existing Linux availability was inspected without installation or service
startup: WSL listed only docker-desktop; Docker had only its default named-pipe
context, its service was stopped, and docker info reported the pipe missing.
No general Linux distribution/container runtime was available for immediate
testing. No Linux test pass is claimed.

The user's earlier no-push constraint remains effective unless explicitly
changed. A narrow publishing question was presented separately because actual
dual-platform CI is the common remaining acceptance gate. Until that gate passes,
the three children and planning parent remain unarchived; no acceptance box is
checked by this record. All implementation work is already locally committed.

Verification-receipts remains planning and untouched. Its explicit prerequisite
is reliability v1 completion followed by a period of actual use, so this request
to close existing work does not start its brainstorm or implementation.

## Requested retained paths

- `C:\Users\lyh\AppData\Local\Temp\trellis-native-host-01671-hMsRhM`
- `C:\Users\lyh\AppData\Local\Temp\trellis-windows-integration-28b7dd8cdd34`

Both existed when inspected. Earlier automatic approval review rejected their
cleanup with only `blocked by policy`; neither directory was deleted, retried,
or accessed through an alternative cleanup route during this follow-up.

The new Node18 fixture
`C:\Users\lyh\AppData\Local\Temp\trellis-doctor-node18-67a5008f5987` also remains:
its single contained normal PowerShell cleanup plan was rejected before process
start with only `blocked by policy`. No retry or alternate route was attempted.
All functional tests and byte comparisons had passed before cleanup.

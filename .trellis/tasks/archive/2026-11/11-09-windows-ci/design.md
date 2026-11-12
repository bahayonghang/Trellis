# Windows CI design

Use an OS matrix (Ubuntu and Windows), with bash and pwsh respectively.
Build using Node 26.7.0 (the development runtime). Run all existing gates on
that runtime. Also run the built CLI smoke on Node 18.17.0, the declared runtime
floor: Vitest 4 itself requires Node 20+, so it cannot validate that floor.
Keep checkout autocrlf defaults and pin real Python 3.9 on both operating systems.

A standalone Node smoke under packages/cli/test drives the built CLI and Python
task script in an isolated Chinese/space temporary path. It verifies task state,
archive placement and update dry-run immutability, including a CRLF workflow.
No host sessions, new skips, retry changes, dependencies or product changes.

Scope: .github/workflows/ci.yml, the smoke test and these task artifacts. Remote
job success requires a future authorized push/PR; local success cannot replace it.

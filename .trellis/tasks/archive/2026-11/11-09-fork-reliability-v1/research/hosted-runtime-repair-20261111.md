# Hosted runtime follow-up — accepted 2026-11-11

The independent follow-up task `11-11-hosted-ci-runtime` has now resolved the previously recorded Ubuntu Python3.9 distribution and Windows8.3 native watcher blockers, plus the concrete full-suite issues revealed afterward. The archived local-delivery history remains unchanged.

Source commits: `c8972b98` (Ubuntu24.04 pin, both Windows watcher targets and persistent native-path guards), `c85aff5b` (owned SessionStart UTF8 stdout and portable source-import/physical-path/OMP Temp fixtures). No API/JSON/containment relaxation, new skip, deadline/concurrency change, force push, upstream write, package/tag/npm publish or global launcher change was used.

Final source `c85aff5b019ce2ba14e8643924901ca1aef1e1b2`:

- https://github.com/bahayonghang/Trellis/actions/runs/43149689290 (dev push): four jobs success.
- https://github.com/bahayonghang/Trellis/actions/runs/43149695069 (PR #1): four jobs success; actual merge `c05065db730cc1b2285276571ab2a3d62cc865bb`.

LinuxNode26 core404/1 existing skip and CLI2275/no skips passed, including all6 symlink cases. WindowsNode26 core403/2 existing skips and CLI2273/35 existing skips passed. Both Node18 rows completed their configured build/runtime smoke; their conditional full-suite skips are not full-test passes. All8 recursive checkouts, Python setup and CLI smoke steps succeeded with the unchanged marketplace gitlink.

The new task's `research/verification-20261111.md` and `final-hosted-jobs-20261111.json` preserve job links, actual source/merge SHA, raw-log paths/hashes, counts/skips and the earlier failed attempts. The final evidence also records local source-launcher and disposable-project acceptance. It does not establish every AI-host UI/platform scenario or absence of future transient failures, and it does not erase the initial unexplained local platform-test timeouts.

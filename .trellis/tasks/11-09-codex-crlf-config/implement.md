# CRLF configuration regression plan

- [x] Read PRD and review upstream #656 diff. Only the two configurator regex
  fixes and directly related CRLF tests/spec contracts are candidates; unrelated
  Windows tests and formatting are already owned by archived work.
- [ ] Run update on an isolated project with CRLF Codex model/effort settings
  and OMP files; record what is and is not reproduced before source edits.
- [ ] Rebuild/verify GitNexus identifiers and run precise upstream impact for
  any edited existing symbol. Stop and explain HIGH/CRITICAL. Do not interpret
  ID-less graph output with unrelated callers as reliable impact evidence.
- [ ] If the gap reproduces, selectively port still-missing #656 fixes and
  exact LF/CRLF body-preservation tests. Otherwise add regression coverage only
  and record '未能复现' in the parent PRD.
- [ ] Run configurator, OMP, init/update parity and appropriate command tests,
  lint/typecheck/build, independent check and full pre-commit. Commit with #656
  attribution if ported, then archive after acceptance.

The Windows Actions job includes these tests but remote results are unavailable
without a push. No whole-body newline normalization, deps or timeout changes.

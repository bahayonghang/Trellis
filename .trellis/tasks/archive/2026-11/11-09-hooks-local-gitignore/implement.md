# Implementation plan

- [x] Review upstream #648 diff and select the narrow hooks.local.json behavior.
- [x] Recheck GitNexus for every edited symbol after index refresh; report
  direct callers/processes/risk and stop on HIGH/CRITICAL.
- [x] Add RED regressions for init/update with real git check-ignore, repeated
  operation, CRLF/BOM/custom comments/negations and force reinit preservation.
- [x] Implement shared additive planning, update skip/dry-run/ownership guards,
  tracked-file advice and the template/dogfood rule.
- [x] Test real Git index unchanged for tracked file advice; external/dangling
  file and workflow-directory links remain unchanged (Windows junctions or
  controlled filesystem boundaries where symlink privileges are absent).
- [x] Run focused tests, lint, typecheck, build, Python minimum checks if needed;
  independent check and full pre-commit; Conventional Commit with attribution
  `Ported from mindfold-ai/Trellis#648`; archive only after acceptance passes.

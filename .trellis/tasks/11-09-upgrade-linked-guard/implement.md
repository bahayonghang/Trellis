# Upgrade checkout guard

The PRD specifies the behavior and testable acceptance, so this is a bounded
command change rather than a package-management redesign.

- [ ] Detect checkout from the executing CLI module/package location (not cwd),
  recognizing .git directories and worktree .git files. An installation under
  node_modules keeps npm behavior even if an ancestor directory is a checkout.
- [ ] Add --force-npm to the existing upgrade command. Reject checkout mutation
  by default with git pull / just build / just install guidance. Dry-run reports
  checkout detection and intended refusal/override without spawning npm.
- [ ] Preserve tag validation, npm-global invocation and failure contracts.
- [ ] Regress checkout/nongit/worktree/node_modules paths, default refusal,
  force override and dry-run. Run lint/typecheck, build, focused tests, real
  installed shim dry-run, independent review, and the full pre-commit suite.
- [ ] Commit only this task's paths, then archive only if acceptance is met.

Expected files: commands/upgrade.ts, cli/index.ts, upgrade tests, the existing
upgrade spec and this task's artifacts. No dependencies or installer rewrite.
Run GitNexus upstream impact before every existing-symbol edit; stop and report
HIGH/CRITICAL. Rollback is the single task implementation commit.

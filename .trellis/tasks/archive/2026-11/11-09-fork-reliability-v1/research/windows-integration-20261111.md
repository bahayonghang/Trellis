# Windows local integration preflight (2026-11-11)

Status: the four requested local functional steps passed. Cleanup is blocked.
This is a local preflight while CI-dependent children remain open, not formal
parent completion. Parent status stays planning; no parent acceptance box,
task status/archive, product source, existing receipt or journal was changed
by this reviewer. No commit/push was performed in the actual checkout.

## Environment and isolation

- Source checkout: `dev`, product commit `e7583d64`; freshly built CLI through
  its actual `packages/cli/bin/trellis.js` entrypoint.
- Native Windows PowerShell7.6.9, Node26.7.0 and existing CPython3.9.25.
  No WSL, runtime installation or dependency change.
- Owned project: `<TEMP>/trellis-windows-integration-28b7dd8cdd34/中文 空间 repo`.
  The fixture's own Git repository and branch/task metadata were finalized
  before opening Codex from its `src/` directory.
- Inherited Git-coordinate/project-directory variables were removed only
  from disposable command processes. Lifecycle commands used the existing
  TRELLIS_CONTEXT_ID override with a fixture-only identity; native Codex did
  not inherit that override. The real checkout's runtime pointer was not
  manually changed.
- Fixture-local commit identity used Integration Smoke / an example.invalid
  address. No real/global Git identity, hooksPath, signing or autocrlf setting
  was changed. Inherited `core.autocrlf` was `true` throughout.
- The actual checkout was protected with a680-entry snapshot of workflow,
  scripts, config/platform mirror trees (including the three divergent hook
  mirrors), .agents/AGENTS.md and real Git index/config/HEAD/optional related
  files. Links were recorded rather than followed. The complete snapshot was
  identical after fixture preparation and again after native shutdown.

## Step results

| Step | Result | Evidence |
| --- | --- | --- |
|1. init, workflow edit, add Codex, update --dry-run | PASS | Initial `init --yes --claude --user integration` installed only Claude. Inserted a unique no_task breadcrumb marker and separate workflow-edit marker, with CRLF workflow bytes. `init --yes --codex --user integration` preserved the exact edited workflow hash. `update --dry-run` listed workflow.md under Modified by you; all fixture paths/bytes including Git metadata were identical before/after. |
|2. create/start A, then create B | PASS | Normal create/start A followed by default create B left `task.py current` equal to A. B was not created with --no-start; the active-task preservation behavior was actually exercised. |
|3. default archive A with unrelated staged file | PASS | A was tracked with explicit pathspecs. An unrelated sentinel was staged normally, then default `task.py archive A` created a real archive commit. A became completed in archive, B remained unarchived, and the unrelated cached mode/blob/path plus complete cached-path list were unchanged. |
|4. actual Codex from src | PASS | Direct native Codex0.167.1, normal folder and individual project-hook trust, one bounded prompt. Actual developer workflow-state/no_task injection carried the fixture-only marker; exact final echo matched. No model file/shell/search/network/delegation tools occurred. |

The preserved edited workflow SHA-256 at step1 was
`376ad57b14de6dac3b5fafb32aa38c8caf86f4bb4d682c7b0313abc1ecca37ef`.
The workflow-edit value SHA-256 was
`f546be602f8626311f180bbf015fe48f3e750d6884732e08f631f421a4ca8b43`.
Neither marker value was placed in the native prompt.

### Setup refusals retained, then corrected normally

Two setup mistakes were caught before the native session; neither is silently
counted as a successful first attempt or a product defect:

1. A's first start was refused because freshly created implement/check JSONL
   manifests were empty. Added a short actual PRD, curated workflow.md through
   normal `task.py add-context` for both manifests, and ran `task.py validate`.
   Start then passed. No --allow-empty-context bypass was used.
2. First archive was refused because branch and base_branch both named main.
   The task was unchanged by that refusal. Created a real fixture feature branch,
   corrected A through normal `task.py set-branch`, and committed only A's
   corrected metadata while preserving the already staged sentinel. Default
   archive then passed. No --skip-branch-validation or --no-commit was used.

The successful archive commit was fixture-only
`95df56aa083a53758bef74c3816b1ac0c1257b9f`. Its changed paths were exactly A's
four source files and four corresponding archive files. It did not include B
or the unrelated sentinel. The sentinel retained mode100644, stage0 and blob
`4208d8953ed5bbeee092689b2d9eab9e31d3d761`; it was still staged after native use.
All manual staging/commits used explicit fixture pathspecs. No git add -A,
--no-verify, broad real-repository staging or hook disabling occurred.

## Actual native-host evidence

Launched `codex --no-alt-screen --no-daemon` directly in the PTY, without a
uv/Node TUI wrapper. A process-local PATH prefix selected the checkout's existing
Python3.9.25 environment. No global PATH/model/provider/auth setting was changed.
Native session metadata reported CLI0.167.1 and the expected Chinese/space
`src/` cwd. The actual turn retained GPT-6.1-Sol/high and provider openai.

Normal Folder access approval explicitly applied to the fixture Git root.
The startup review opened the ordinary hooks browser. The project
UserPromptSubmit entry showed Project config at the fixture's .codex/hooks.json,
the generated Python/base64 command, Sync/15s, then Trusted/Active after its
normal individual `t` action. The event showed2 installed/2 active/0 review;
the existing global UserPromptSubmit hook was preserved. SubagentStart was
not invoked or newly trusted for this parent-only preflight; its separate
task5 native acceptance is not repeated here.

Official trust-flow reference, fetched for this run:
https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks . Normal native
folder/hook trust may persist through CODEX_HOME; no trust record or user config
was edited manually, and global-config byte invariance is not claimed.

Exactly one bounded model prompt requested the already injected marker, with
no tools, file reads, shell, search, network or delegation. Its expected value
existed only in the fixture workflow file. Native rollout evidence:

- One completed turn in about6seconds; no fallback or second model prompt.
- Native developer message ordinal13 contains the exact marker inside the
  workflow-state envelope and correctly reports no active task after A's archive.
  B was not borrowed or fabricated as active.
- The expected marker value is absent from user messages; final assistant echo
  equals it exactly. Native tool-call list is empty.
- Developer context SHA-256:
  `376a1f566f4301934ab96c2de643a1687de46aa2ff320c9eafab3b1a2c78be07`.
- Delivered marker SHA-256:
  `241a98a96b1ef2c7d8ecdc2e9902e220efeb57def47188bd3341446b9a1ed483`.
- Project hooks JSON SHA-256:
  `16d66754d1507d47e70ea8c6fbfa0bd02d7895a45226b2773712069e5a3ee3f0`.
- Reviewed UserPromptSubmit command SHA-256:
  `c2bc72b96443c5dd105aa0fd38763d36d6012cd54063a06e564ea781e046847c`;
  its readable final token is `.codex/hooks/inject-workflow-state.py`.

The native history remains Codex-managed; raw session identity/account data,
global custom-hook arguments and full transcripts are not copied into Git.
A weekly-limit reminder appeared but did not block this turn; no model/provider
switch, trust bypass or auth intervention was used. `/exit` closed the native
session normally with exit0, and no native children were spawned.

## Cleanup and limits

Functional checks and final actual-checkout hash comparison completed before
cleanup. The submitted cleanup plan first validated the exact owned Temp target
and ordinary contained fixture .git, then used native PowerShell
`Remove-Item -LiteralPath <owned-top> -Recurse -Force`. Automatic approval review
rejected that plan **before process start**, stating only `blocked by policy`.
Deletion did not run. No retry, per-file alternative, other-shell route or
approval bypass was attempted.

Remaining fixture: `%TEMP%/trellis-windows-integration-28b7dd8cdd34`.
It contains generated Trellis code, synthetic workflow/task/sentinel data,
fixture Git metadata and local evidence/hash manifests, not copied auth secrets.
The earlier policy-blocked task5 fixture was never touched. Cleanup is
**blocked/not completed**, not PASS.

No remote Windows/Linux CI was run or pushed. Claude configuration here is
not native Claude acceptance; no new SubagentStart/matrix acceptance is claimed.
The CI-dependent child tasks and parent remain unarchived/planning as directed.
Verification-receipts was neither implemented nor brainstormed: its prerequisite
is completing the reliability release and using it for a period afterward.
No product changes, parent acceptance edits or task-status changes are made by
this preflight. Only this new parent research receipt is retained in Git.

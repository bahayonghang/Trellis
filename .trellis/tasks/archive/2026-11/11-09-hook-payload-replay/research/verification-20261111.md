# Payload replay verification (2026-11-11)

Implementation scope is tests and fixture documentation only. No existing
product function, template hook, platform config or dogfood mirror was edited.
No dependency, timeout, skip, event or CI action was added. No build/dist
operation was needed for this test-only change. Main owns final spec review,
GitNexus detect_changes, commit and task status.

## Inputs and provenance

- Five Claude fixtures: SessionStart/UserPromptSubmit from2.1.62, PreToolUse
  Task from2.1.62 and Agent from2.1.63/2.1.286. Each is selected from
  hookcompat commit `2c0891c4cfae44f576c8dc564cbd164981b2326a`; the fixture
  README includes exact immutable paths, source blob IDs, adjacent recording
  evidence and the upstream MIT notice. The two early-event files are
  **unreviewed upstream**; that caveat is retained. Reviewed PreToolUse files
  also retain the caveat that unredacted raw stdin was not independently seen.
- Two genuinely observed local Codex0.167.1 inputs, collected by temporary
  observer commands for UserPromptSubmit and SubagentStart. Normal folder
  trust and individual `/hooks` review were used. Each observer read only its
  own stdin; product hooks/bootstrap behavior was not changed. Current
  GPT-6.1-Sol/high/openai defaults were retained. No manual auth/model/provider
  config edits were made; normal native trust persistence may update CODEX_HOME.
  The native parent trace has
  only spawn_agent and wait_agent, with `fork_turns: none`. The one child was
  default; its captured agent_type stays default. Parent/child session,
  transcript and agent relationships are preserved through redaction.
- Native CLI metadata confirms version0.167.1, provideropenai, sourcecli.
  The bounded turn completed in about18s; `/exit` then returned exit0.
  An approaching-weekly-limit reminder appeared, but no quota/auth/trust
  blocker occurred and no model switch was accepted. No more native model
  calls were needed.
- Raw Codex inputs: UserPromptSubmit725bytes, SHA256
  `57d7e81da7f875185fda349bcaecc63f1768c894bf0be4c32dfb9bdb3f88c695`,
  written2026-11-11T07:50:01.2456185Z; SubagentStart478bytes, SHA256
  `b2a257331f230675818a170886e25981ac6fe64124eb2b5b9c2f9eeda00af0fb`,
  written2026-11-11T07:50:09.5627350Z. Observer source202bytes, SHA256
  `ba97e3c326715fa917d00046dca6f8ed36bdd299dd580674d84477c27cb68a08`.
  Raw temporary files/account histories were not imported into Git. The
  earlier policy-blocked task5 temporary fixture was not touched or deleted.

All host session/turn/tool/agent IDs and personal paths were replaced by stable
replay labels and inert paths. Original tool names, event fields, permission
modes, effort/background fields and prompt strings remain. Derived identity,
role, path and newline variants are labeled separately in tests and README.
No invented host version or capture run is used.

## Coverage and mutation control

Windows new suite:56tests. Claude payload replay selects the shipped matcher
and directly invokes the installed script, with payload cwd independent of
script location. This does **not** verify Claude native launch-cwd behavior.
Codex executes its actual generated commands through native cmd raw `/C` and
pwsh. Layouts are root, subdirectory, nested Git boundary, and Chinese/space
paths with CRLF JSON stdin and CRLF workflow/PRD/spec content. These layouts
are derived replay cases, not additional native capture sessions.

Actual output assertions cover SessionStart workflow/current-task context,
UserPromptSubmit workflow-state text, captured Claude research spec-tree
context, and derived Trellis implement PRD plus curated spec text. Claude
updatedInput preserves all non-prompt tool-input fields and output aliases.
Codex's captured default role is excluded by the installed matcher and remains
silent in a direct real script process. No-identity cases with multiple session
pointers cannot borrow an active task.

Five mutation controls first pass the normal oracle, rename the required output
field in a **disposable installed hook script**, and rerun the real process.
Each mutated hook still exits0 without stderr, but the same context oracle
throws. Normal replay cases do not catch assertion failures. This checks the
requested failure sensitivity beyond an allow decision or success exit.

## Commands and results

All checks below ran through `uv run --locked`, with CPython3.9.25 verified.

| Check | Result |
| --- | --- |
| New replay suite, initial harness run | 30pass/25fail; corrected test assumptions: research output lacks implement marker and Codex matcher is a regex that excludes default. No product defect/fix inferred. |
| New replay suite after harness correction | 56/56pass,25.68s |
| New replay + hook-root + Codex launcher + hook-stdin | 4files/161tests pass,53.88s: replay56, root34, launcher45, stdin26 |
| CLI lint initial | Three new-test style violations; changed object type declarations to interfaces and removed dynamic delete. |
| `pnpm --filter @mindfoldhq/trellis lint` after correction | PASS |
| `pnpm --filter @mindfoldhq/trellis typecheck` | PASS |
| Final new replay suite after explicit CRLF stdin and lint changes | 56/56pass,21.85s |
| New test strict compilation (`tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck --resolveJsonModule test/scripts/hook-payload-replay.integration.test.ts`) | PASS; explicitly includes the new test because normal CLI tsconfig includes src only |
| Final focused `prettier --check` and `eslint` on the new test | PASS |

No full precommit suite was run by the implementer. No existing test skip or
deadline was altered. No build operations are pending; source and fixtures
are ready for independent review.

## Acceptance boundary

The existing `.github/workflows/ci.yml` Node26.7.0 jobs run `pnpm test` on
ubuntu-latest and windows-latest, and Vitest includes this `*.test.ts` file.
Those jobs are not newly exercised remotely under the no-push constraint.
Local Windows replay passed. Native Linux execution and remote Linux/Windows
CI remain **unverified**; do not mark remote-green acceptance complete or
archive on that basis.

This work adds native **input capture** for Codex0.167.1 and local replay
evidence. It does not turn replay into native Claude acceptance, add a native
Codex Trellis-role input capture, or replace task5's distinct context-delivery
host receipt. Constructed role/path/identity variants remain derived.

## Source commit gate

`d7cb0fc0 test(hooks): replay versioned Claude and Codex payloads` passed the
normal full pre-commit: core401 PASS /2 existing SKIP; CLI2205 PASS /35 existing
SKIP (96 files PASS /1 existing SKIP),209.43s. Attribution is
`Ported from mindfold-ai/Trellis#644`. Staged GitNexus scope was LOW:19 files,
36 test symbols,0 affected processes; no product symbols changed.

The main session also removed its mistakenly added code-file JSONL reference;
context manifests contain spec/research documents only. This metadata fix does
not change the tested implementation. Remote CI is still pending, so this task
remains in_progress and unarchived while later local work proceeds.

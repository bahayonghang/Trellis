# Versioned hook input replay

These fixtures exercise the shipped Claude Code and Codex hooks with real
subprocesses. Passing replay means the current scripts consume these payload
shapes and emit the asserted context. It does **not** establish that any current
host discovers, trusts, launches or delivers their output. Remote CI results
are also separate from local replay results.

## Captured inputs and provenance

Claude inputs come from the MIT-licensed [hookcompat repository](https://github.com/k21993/hookcompat/tree/2c0891c4cfae44f576c8dc564cbd164981b2326a),
pinned to commit `2c0891c4cfae44f576c8dc564cbd164981b2326a` (the commit selected
by Trellis upstream PR #644). Original fixture blob IDs are below. The
[recording documentation](https://github.com/k21993/hookcompat/blob/2c0891c4cfae44f576c8dc564cbd164981b2326a/docs/recording.md)
and each adjacent `recording.json` describe the capture method, version,
configuration and invocation evidence. The selected scenario is
`pretooluse-trellis-research-subagent`, recorded on darwin-arm64 with Node
v26.10.0. Its recording metadata reports claude-sonnet-4-6 for 2.1.62/2.1.63
and claude-sonnet-5-5 for 2.1.286; these are source-reported values, not new
local host observations. Preserve [LICENSE.hookcompat](LICENSE.hookcompat).

| Local fixture | Immutable capture source | Original Git blob | Upstream review |
| --- | --- | --- | --- |
| [claude-code/2.1.62/session-start.json](claude-code/2.1.62/session-start.json) | [2.1.62/pretooluse-trellis-research-subagent/01-SessionStart-f9f4eca7.json](https://github.com/k21993/hookcompat/blob/2c0891c4cfae44f576c8dc564cbd164981b2326a/data/fixtures/claude-code/2.1.62/pretooluse-trellis-research-subagent/01-SessionStart-f9f4eca7.json) | `345b3e9036dda7b39ade76c2d492456bda8e39da` | unreviewed |
| [claude-code/2.1.62/user-prompt-submit.json](claude-code/2.1.62/user-prompt-submit.json) | [2.1.62/pretooluse-trellis-research-subagent/02-UserPromptSubmit-d353287c.json](https://github.com/k21993/hookcompat/blob/2c0891c4cfae44f576c8dc564cbd164981b2326a/data/fixtures/claude-code/2.1.62/pretooluse-trellis-research-subagent/02-UserPromptSubmit-d353287c.json) | `faa41f998eca241768b964f4a14d63a908ff4161` | unreviewed |
| [claude-code/2.1.62/pre-tool-use-task.json](claude-code/2.1.62/pre-tool-use-task.json) | [2.1.62/pretooluse-trellis-research-subagent/03-PreToolUse-17a5f25c.json](https://github.com/k21993/hookcompat/blob/2c0891c4cfae44f576c8dc564cbd164981b2326a/data/fixtures/claude-code/2.1.62/pretooluse-trellis-research-subagent/03-PreToolUse-17a5f25c.json) | `fe8d090a2961340dca947ad8fe647879514c591b` | reviewed |
| [claude-code/2.1.63/pre-tool-use-agent.json](claude-code/2.1.63/pre-tool-use-agent.json) | [2.1.63/pretooluse-trellis-research-subagent/03-PreToolUse-4c08e74c.json](https://github.com/k21993/hookcompat/blob/2c0891c4cfae44f576c8dc564cbd164981b2326a/data/fixtures/claude-code/2.1.63/pretooluse-trellis-research-subagent/03-PreToolUse-4c08e74c.json) | `ebf111c7c175c6c9913d0d4bd35e6b550a0fe28e` | reviewed |
| [claude-code/2.1.286/pre-tool-use-agent.json](claude-code/2.1.286/pre-tool-use-agent.json) | [2.1.286/pretooluse-trellis-research-subagent/03-PreToolUse-daf42b61.json](https://github.com/k21993/hookcompat/blob/2c0891c4cfae44f576c8dc564cbd164981b2326a/data/fixtures/claude-code/2.1.286/pretooluse-trellis-research-subagent/03-PreToolUse-daf42b61.json) | `779aea48c4b2044c7d22cb911cb3891053e9d7b4` | reviewed |

The original SessionStart and UserPromptSubmit captures are marked
**unreviewed** upstream; that status is preserved. Their event, session/cwd
relationships and invocation IDs agree with the same run's recording evidence.
The three PreToolUse fixtures are reviewed upstream for schema, consistency
and redaction, with the explicit caveat that the reviewer did not independently
observe unredacted stdin. This repository checked the selected JSON and source
metadata; it does not upgrade either assertion to independent native Claude
acceptance. The original Task tool in 2.1.62 and Agent tool in 2.1.63/2.1.286
remain unchanged. Newer captures' permission/effort/background fields remain.

Codex inputs were observed locally from installed **codex-cli 0.167.1** on
Windows on 2026-11-11 UTC. A temporary project installed two observer handlers
for the existing UserPromptSubmit and SubagentStart events. Each observer read
its own stdin and saved it unchanged. The normal folder-trust screen and
individual `/hooks` review activated them. The native TUI used current
GPT-6.1-Sol/high/provider-openai defaults, without install, downgrade, model
switch or trust bypass. No manual auth/model/provider config edits were made;
normal native trust persistence may update CODEX_HOME. A bounded native turn
spawned one default child with `fork_turns: none`; the recorded parent tool
trace contains only spawn_agent and wait_agent. The native turn completed in
about18s and exited normally. This is input-capture evidence, not a repeat of
the previous task's Trellis context-delivery acceptance.

| Local fixture | Raw input written UTC | Raw byte length | Raw input SHA-256 before redaction |
| --- | --- | --- | --- |
| [Codex UserPromptSubmit](codex/0.167.1/user-prompt-submit.json) | 2026-11-11T07:50:01.2456185Z | 725 | `57d7e81da7f875185fda349bcaecc63f1768c894bf0be4c32dfb9bdb3f88c695` |
| [Codex SubagentStart](codex/0.167.1/subagent-start.json) | 2026-11-11T07:50:09.5627350Z | 478 | `b2a257331f230675818a170886e25981ac6fe64124eb2b5b9c2f9eeda00af0fb` |

The observed SubagentStart `session_id` is the **parent** session identity;
`agent_id` and the transcript path identify the child. These relationships
survive redaction. Its actual `agent_type` is `default`; Trellis's configured
matcher excludes it, and the direct script guard must remain silent. We have
not relabeled that capture as an observed Trellis-role input.

## Redaction and derived cases

All local fixtures replace session, turn, prompt/tool-use and agent identifiers
with fixed `replay-*` labels where those fields exist. Cwd is
`/hook-replay/repo`; transcript paths are inert `/hook-replay/home/...`
placeholders. Upstream recorder run/invocation IDs are retained for cross-checking
its recording evidence; they are not host session identities. Payload fields,
types, nesting, prompts and tool names otherwise remain captured data.
No account/auth/config contents or personal paths are copied into fixtures.

At replay time only cwd is remapped to an owned temporary directory. Root,
subdirectory, nested Git, and Chinese/space paths with CRLF JSON stdin and workflow/PRD/spec
files are **derived layouts**, not separately captured host runs. Identity
removal and changing the captured research/default role to
`trellis-implement` are explicit **derived payload variants**. The latter
assert exact fixture PRD and curated spec fragments through updatedInput
(Claude) or additionalContext (Codex); captured Claude research inputs assert
its actual spec-tree context instead of assuming research loads task PRDs.
No-identity cases retain multiple session pointers and verify no task borrowing.

Claude replay selects its configured Task/Agent matcher and invokes the actual
installed script by absolute path with the captured/derived payload cwd.
This does not simulate or verify Claude's native shell cwd policy. Codex runs
the actual generated command with cmd's raw `/C` convention and pwsh on Windows,
or /bin/sh on POSIX. Its default-role control verifies both matcher exclusion
and a real direct script invocation. No model calls or dependencies are needed
for replay.

The five mutation controls first pass the normal context oracle, then rename
the required output key in the **temporary installed script** and rerun the
real subprocess. The same oracle must throw despite exit0 and other output
aliases remaining. Normal cases use that oracle without catching failures, so
a corresponding shipped regression fails CI instead of passing on allow/exit0.

## Refresh

1. Pin an immutable capture repository ref and inspect the payload plus its
   recording evidence; never infer a host version from a filename alone.
2. For a local native capture, use a fresh disposable project, normal trust and
   current authenticated defaults. Record only the existing events needed.
   Save raw byte length/hash and actual CLI version before sanitizing. Do not
   modify Trellis hook stdin behavior or copy user auth/global configuration.
3. Review every payload field and nested string for personal paths, session/turn/
   tool/agent IDs and secrets. Replace consistently; preserve field types and
   parent/child relationships. If a secret is present, remove it from all saved
   artifacts before importing. Keep original source review caveats and license.
4. Add the sanitized capture and provenance here. Label any changed tool/role,
   identity, path or newline scenario derived. Run the focused suite with Python
   3.9 from the repository root:
   `uv run --locked pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/hook-payload-replay.integration.test.ts`.
5. Verify context, envelope, preserved input fields and mutation controls. The
   existing Linux/Windows CI matrix includes all CLI tests; record actual CI
   results separately, and never claim replay is native host acceptance.

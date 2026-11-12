# Hook payload replay implementation

1. Review #644 at head `0d6e843a0ca52af531585c2f4c1e547c509c9592`
   against base `f089cb3286071199e84118dee86b6d76aab032f1` before porting.
   Its two-file diff adds an Ubuntu-only external action and checks only allow;
   retain versioned payload replay, use existing Vitest/OS matrix, and assert
   actual injected PRD/spec context. Do not add an external action/dependency.
2. Save sanitized Claude/Codex payloads with exact host-version provenance.
   Distinguish captured payloads from derived path/identity variants; never
   label constructed inputs or prior output-only host receipts as captures.
   Prefer reviewed upstream captures; obtain minimal native captures only when
   needed, with current defaults, normal trust and no secret/config edits.
3. Run shipped hooks/configuration in disposable projects: Claude SessionStart,
   UserPromptSubmit and PreToolUse Task/Agent; Codex's two existing events only.
   Cover root/subdirectory/nested Git, Chinese/space/CRLF and identity present/
   absent. Do not add product events, modify stdin behavior or divergent mirrors.
4. Assert protocol envelopes and actual task/spec text. Demonstrate a failing
   replay when the context output is removed; document fixture refresh and
   redaction. Before any existing symbol edit, run exact GitNexus impact and
   stop/report HIGH/CRITICAL. Expected change is tests/fixtures only.
5. Run Python 3.9 focused tests, lint/typecheck and independent review. Record
   replay vs native-host evidence separately. Existing CI matrix includes the
   suite; remote results stay unverified under the no-push constraint.
6. Main inspects staged detect_changes, commits with explicit paths and
   `Ported from mindfold-ai/Trellis#644`; archive only when AC evidence exists.

The user requested continuing local validation on 2026-11-11. Windows CI code
is implemented, but its remote-green AC remains open; do not claim otherwise.

The later user instruction on 2026-11-11 changes this closeout to local-only.
The PRD now accepts the completed local suite plus matrix inclusion; hosted
execution is outside this round. Preserve failed-checkout/not-run evidence and
archive only against these explicit revised criteria, never as a CI-green claim.

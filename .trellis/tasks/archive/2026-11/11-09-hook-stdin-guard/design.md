# Bounded hook input design

## Boundary

Selective follow-up to upstream #591, not an as-is copy of its three 0.2-second helpers. This PRD requires a shared implementation, delayed valid payloads, configurable timeout and diagnostics. Cover every Python hook input reader: four shared entrypoints, Codex/Copilot SessionStart, optional Claude statusline, and Snow's existing bounded drain. CLI `add_session.py` deliberately reads a user-provided stdin document and is not a hook; do not change it. JS/TS hosts already supply objects rather than raw stdin.

## One standalone support asset

Keep one canonical standard-library-only helper under `packages/cli/src/templates/shared-hooks/`, installed beside consuming hook scripts. It must not import `.trellis/scripts/common`: reading input must work before cwd/root/session discovery. Separate support assets from registered event entrypoints so the capability registry does not pretend the helper is a hook. Shared hook collection distributes support assets for all registered platforms; Snow's independent collector and optional statusline deployment must receive the same canonical content. Helper installation must precede importing entrypoints in init/update map order.

Do not keep eight copies of the input algorithm. Source-only fixtures that previously copied one entrypoint must now materialize its support asset too, reflecting the installed contract. Resolve canonical helper types through an explicit source path if necessary, not an import-error suppression or an unbounded fallback. Preserve all init/update/manifest/uninstall ownership invariants.

## Reader contract

- Default deadline: 2 seconds. `TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS` overrides it; reject non-finite/non-positive/absurd values with the documented bounded fallback. EOF returns immediately.
- A daemon worker reads pipe bytes without holding Python's buffered stdin lock through interpreter shutdown. A queue/deadline bounds the main thread on Windows and POSIX; do not use POSIX-only `select` for Windows pipes. Test actual process termination under CPython 3.9, not just a helper returning.
- Accumulate complete UTF-8 input across arbitrary chunks. A complete single JSON object may be returned before EOF, so a host that writes the whole object but keeps the pipe open does not lose context. Incomplete input continues until completion, EOF or deadline. Validate the accumulated document, not an arbitrary 4096-byte prefix. No new small payload cap that rejects the required multi-megabyte valid case.
- EOF with no data, invalid JSON, non-object JSON, read errors and deadline expiry all fail soft. Preserve successful stdout/envelopes; never print input payloads in diagnostics.
- `TRELLIS_HOOK_INPUT_DEBUG=1` enables distinct stderr categories (`timeout`, `empty`, `invalid-json`, `non-object`, `read-error`, invalid timeout setting). Default stderr remains compatible with existing silent paths.
- Expose a bounded raw-read primitive as needed for Snow, whose existing wrapper-tolerant JSON parser must remain compatible. Do not silently remove its supported wrapped-payload behavior. All actual reads still use the same bounded primitive.
- No `os._exit` shim unless a real interpreter shutdown defect is reproduced and requires it. No product context/output or root-discovery redesign in this task.

## Dogfood compatibility

Snapshot all installed hook bytes before editing. Mirror only copies identical to their matching product source before this change. Current matches include Claude/Cursor shared SessionStart, Codex standalone SessionStart, Claude/Codex workflow state and Cursor shell-session hooks. Existing subagent dogfood copies differ; preserve them. Add the required support asset beside each newly importing mirrored script. Do not touch `.pi`, the drifted local workflow, marketplace, or maintainer task artifacts.

## Tests and risks

Use real installed hook maps in temp projects and Python 3.9 subprocesses. Assert held-open empty input terminates, complete payload held open is consumed, valid JSON arriving after 0.5 seconds survives, empty/malformed/non-object inputs are nonfatal, multi-megabyte Unicode payloads are intact, normal closed-pipe outputs remain equivalent, diagnostics are opt-in and distinct, and invalid timeout values cannot create an unbounded wait. Verify assets for every platform through existing registry/configurator tests, including optional statusline/Snow and update collection.

Main risks are helper asset omission, raw-source fixture assumptions, invalid UTF-8 boundaries, reader-thread shutdown, Snow compatibility, and stdout protocol drift. Validate those specifically; do not hide failures with Vitest retry/skip or a larger test budget. Existing root-resolution defects remain for task `hook-trellis-root`.

## Rollout / rollback

Ship helper before importing hook files in template maps; update existing projects through normal hash tracking. Revert this task's code/assets together if rollback is needed. No global installation, external service, billed agent session, marketplace change or unrelated file deletion is required.

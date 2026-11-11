# Doctor aggregate GitNexus stop

The final staged detect_changes result is CRITICAL: initially14 files,
63 indexed changed symbols and18 affected flows. This additional scope record
does not change product symbols/flows. No doctor commit has been attempted.
The user requires a stop/explanation for HIGH/CRITICAL; earlier getHooksConfig
and gitignore approvals do not approve this new aggregate scope.

The same installed GitNexus1.6.12 LocalBackend `detect_changes` tool was called
read-only to inspect its complete structured result (the CLI formatter displays
only10 flows). It returned the full18-flow list without partial/truncation
flags. Raw local result: `%TEMP%/trellis-doctor-scope-full.json`.

## Complete affected flow groups

| Changed entry | Count | Endpoints |
| --- | --- | --- |
| collectDoctorReport |3| Inside, CheckPackageJson, FileExists |
| platformChecks |8| GetPythonCommandForPlatform, ShouldExclude, ToPosix, ListMarkdownFiles, ReadTemplate, GetClaudeTemplatePath, FilterCommands, CollectTemplates |
| inspect (new packaged Python probe) |7| _env_platform_name, _iter_env_keys, _hash_value, _sanitize_key, _runtime_sessions_dir, _as_dict, _string_value |

Indexed symbol changes belong only to the new doctor module, new internal probe
and new integration test. The existing CLI entrypoint has only an import, doctor
registration and the narrow startup-banner condition; checkForUpdates's body is
unchanged. No canonical reader, registry, hash writer, SDK or project hook/config
body is edited. The manifest/spec/task files supply the remaining changed paths.

The installed backend's risk ladder uses affected flow count:0=low,1..5=medium,
6..15=high,>15=critical.18 therefore produces CRITICAL even though these are
expected diagnostic read chains. This is not dismissed as an index anomaly.
Precise pre-edit impacts were separately LOW; new not-yet-indexed helpers were
recorded UNKNOWN with source-local callers rather than falsely labeled LOW.

## Evidence and boundary

Independent doctor34 + platforms3 =37 tests pass, including RED/GREEN fixes
for missing asset names and exact allowed-prefix portable recognition. Static,
strict TS, Python3.9, build and package checks pass. The actual checkout's
2,762 entries and58 existing source-cache entries were byte-identical around
the final schema-valid doctor invocation. Its exit1 truthfully names the
pre-existing missing `.opencode/package.json`; the project is not repaired.

No native/model call or host-verified claim is introduced by doctor. Local
Node18-specific smoke and remote Linux/Windows CI remain not_run. Full
pre-commit/source commit was paused at this gate. The user then explicitly
answered: "允许按当前 doctor 范围继续提交". This authorizes the unchanged reviewed
doctor scope and normal full pre-commit/local commit. No push is authorized;
CI-dependent task/parent archival remains open.

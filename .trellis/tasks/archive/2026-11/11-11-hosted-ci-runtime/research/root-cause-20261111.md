# Root-cause investigation — 2026-11-11

## Current evidence

Local dev HEAD09c34d30, clean before task creation, no active task; prior checkout task archived. Latest PR run43141109344 completed/failure. Jobs130928040192 Windows18 success;130928040470 Ubuntu26 Python setup failure;130928040488 Windows26 core test worker crash;130928040584 Ubuntu18 Python setup failure. All four Checkout success. Downloaded latest Linux26/Windows26 logs to C:/Users/lyh/AppData/Local/Temp/trellis-ci-runtime-43141109344/.

Linux error: The version '3.9' with architecture 'x64' was not found for Ubuntu26.04. Official https://raw.githubusercontent.com/actions/python-versions/main/versions-manifest.json was fetched:3.9.25 has Linux x64 builds for22.04/24.04, no26.04. Proposed runner24.04 retains the interpreter-floor contract; changing Python to an unrelated newer version would lose that coverage.

Windows log has Assertion failed: !_wcsnicmp(filename, dir, dirlen), file src\win\fs-event.c, line72, followed by unexpected Vitest worker exit. Ordinary local core watch.test.ts passed1/1,20ms, showing why a normal local run is insufficient.

## Independent native probe

Created a disposable directory and probe.cjs under C:/Users/lyh/AppData/Local/Temp/trellis-watch-path-probe-f463fabde9bf4cab96f4b4b7d343bc53. Probe uses fs.watch(directory), creates/appends events.jsonl and closes the watcher after1second. Scripting.FileSystemObject.ShortPath exposed the same physical directory as C:/Users/lyh/AppData/Local/Temp/TRA2F2~1/OBSERV~1.

- Node26.7.0 with short path: same native assertion, exit -1073740791.
- Same probe/physical directory with long path: emitted change event, exit0.
- Same short input after fs.realpathSync.native: emitted change event, exit0.

No application code was changed for this diagnosis. This establishes a reproducible native fs.watch short-path trigger and a candidate canonical-path mitigation. It does not yet establish red/green against the actual application implementation.

Official source inspected via GitHub contents API: https://github.com/nodejs/node/blob/v26.7.0/deps/uv/src/win/fs-event.c . uv__relative_path asserts that a long filename starts with handle->dirw; the short-name expansion branch passes long_filenamew and handle->dirw into it. Both live application watchers call fs.watch(channelDir(...)) without canonicalization:

- packages/core/src/channel/internal/store/watch.ts:105
- packages/cli/src/commands/channel/store/watch.ts:128

Sibling search fs.watch( across core/CLI source found exactly these two sites. Existing try/catch and error listeners cannot catch a process-aborting native assertion.

## Preliminary impact analysis

GitNexus query was degraded because FTS is unavailable; used source inspection and exact file-qualified impact instead. Index is2commits behind; intervening commits only changed URL/task records. Refresh before implementation and repeat impact for every symbol to edit, including tests.

- core watchEvents: HIGH,4direct callers,6 upstream symbols,3 affected API processes (watchChannels,watchWorkerInbox,watchWorkers).
- CLI watchEvents: CRITICAL,4direct callers,8 upstream symbols,5 processes: registerChannelCommand,channelRun,channelMessages,runInboxWatcher,channelWait.

Risk was explicitly communicated to the user before edits. Scope is native watcher target canonicalization only; event semantics, polling, public APIs and lifecycle must retain regression coverage. No code modified yet.

## Self-use installation

Get-Command trellis/tl resolves to C:/home/lyh/.npm-global/*.ps1. The trellis wrapper calls node D:/Documents/Code/Agents/Trellis/packages/cli/bin/trellis.js and forwards arguments/stdin. trellis --version returned0.6.17. It also printed an existing project update notice0.6.14→0.6.17; that notice is not evidence that the executable is an old npm installation. No trellis update or global install was run. A later clean build and disposable-project smoke must verify actual generated functionality.

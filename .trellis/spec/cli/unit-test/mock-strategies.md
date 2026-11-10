# Mock Strategies

> Principles and patterns for mocking in tests.

---

## Core Principle: Minimal Mocking

Only mock **external dependencies** that are:
1. Non-deterministic (network, time, random)
2. Interactive (TTY prompts)
3. Side-effectful (child processes, file system writes to system paths)

**Never mock internal modules** — let real code execute through the full path.

---

## Standard Mock Set

For command-level integration tests, this is the minimal set:

| Dependency | Why Mock | How | Used In |
|------------|----------|-----|---------|
| `figlet` | ASCII banner, not testable output | `vi.mock("figlet")` | init, update |
| `inquirer` | Interactive prompts, no TTY in CI | `vi.mock("inquirer")` | init, update |
| `node:child_process` | Git config, Python script calls | `vi.mock("node:child_process")` | init, update |
| `fetch` (global) | npm registry network call | `vi.stubGlobal("fetch")` | update only |
| `process.cwd()` | Redirect to temp directory | `vi.spyOn(process, "cwd")` | init, update |
| `console.log/error` | Silence output | `vi.spyOn(console, "log")` | init, update |

---

## Mock Patterns

### Module Mock (hoisted)

```typescript
// Placed at top of file — vitest hoists vi.mock calls
vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));

vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockReturnValue(""),
}));
```

### Global Stub

```typescript
// In beforeEach — not hoisted, must be in setup
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ version: VERSION }),
}));

// In afterEach — MUST restore
vi.unstubAllGlobals();
```

### Spy (partial mock)

```typescript
// In beforeEach
vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
vi.spyOn(console, "log").mockImplementation(noop);

// In afterEach
vi.restoreAllMocks(); // Restores all spies
```

---

## inquirer Mock: init vs update

The two commands have different inquirer skip conditions:

**init**: `--yes` flag skips all inquirer prompts. Mock can return empty `{}`.

```typescript
vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({}) },
}));
```

**update**: `--dryRun` returns before confirm prompt. Batch-resolution modes
(`force`, `skipAll`, `createNew`) must not hit the final confirm prompt either.
Plain interactive update paths and `migrate` without a batch flag may still
prompt, so the default mock should return `{ proceed: true }`.

```typescript
vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));
```

When testing a non-interactive batch path, clear the mock after setup and assert
it was not called:

```typescript
vi.mocked(inquirer.prompt).mockClear();
await update({ force: true });
expect(inquirer.prompt).not.toHaveBeenCalled();
```

---

## Things NOT to Mock

| What | Why |
|------|-----|
| `fs` (node:fs) | Tests run against real temp directories |
| `path` (node:path) | Pure computation, deterministic |
| Internal modules (`configurators/`, `utils/`, `templates/`) | Let real code execute |
| `chalk` | Auto-detects no TTY and disables colors |

---

## Known Gotchas

### Module-Level State: `setWriteMode`

`file-writer.ts` has module-level state for write mode. If one test sets `force` mode, subsequent tests inherit it unless reset. The `init()` function calls `setWriteMode()` internally, so integration tests that call `init()` are safe. But direct unit tests of `writeFile` must manage this state explicitly.

### Template Placeholder Resolution

`collectPlatformTemplates()` must return templates with `{{PYTHON_CMD}}` **already resolved** (matching what `configurePlatform()` writes to disk). The `resolvePlaceholders()` function in `configurators/shared.ts` handles this. If a new placeholder is added to templates, it must be resolved in both `configure()` and `collectTemplates()`.

---

## Pi Context-Envelope Fixture Isolation

### 1. Scope / Trigger

`test/templates/pi.test.ts` evaluates the real extension template in a VM.
Envelope/cache tests use a minimal `get_context.py` fixture, not the shipped
Python implementation. Real interpreter startup exceeded the product's 1500 ms
deadline during a parallel Windows run; do not make these unit contracts depend
on that startup latency.

### 2. Signatures

- `createMinimalTrellisRoot(): string` registers its script path and root.
- `loadExtensionInternals(cwd?, env?, contextSpawnSync?)` accepts an explicit
  external-boundary override for deterministic process-failure tests.

### 3. Contracts

Intercept **only** `node:child_process.spawnSync` calls for registered fixture
scripts: exact platform Python command, actual script path, actual `options.cwd`,
and either no extra args or `--mode phase --platform pi`. Dispatch per call, not
by the VM's initial cwd: session root switches must select the new fixture.
Default stdout and the runnable Python fixture share output constants.

Keep the template, temporary filesystem, parser, caches and envelopes real.
Other programs/scripts/cwd/argv, including optional native call forms, pass
through; `spawn` remains real for fake-Pi Node protocol tests. Keep host-env
scrubbing in `test/setup.ts`. Never fix this unit-test coupling by increasing
the product timeout, adding Vitest retries/skips, or mocking `workflowOverview`.

### 4. Validation / Error Matrix

| Boundary | Assertion |
| --- | --- |
| Overview / phase success | Exact command, script, argv, cwd, session env, UTF-8 encoding, `timeout: 1500`, `windowsHide: true`; trimmed output reaches real envelopes |
| Native process unavailable or observed phase-timeout result | Registered fixtures still yield successful envelopes without calling native `spawnSync` |
| Explicit fixture override: status null / ETIMEDOUT, nonzero status, thrown error | Real `runContextScript` returns empty; real `workflowOverview` omits output; pair with success controls |
| Phase fails after overview succeeds | Overview remains present, workflow absent; startup cache retains that omission |
| Nonfixture process | Original arguments forwarded to native `spawnSync`; actual child `spawn` protocol tests still execute Node |

### 5. Good / Base / Bad Cases

Base: deterministic fixture stdout enters the real template. Good: switching
roots resolves the actual destination script, while Node children remain real.
Bad: blanket-stubbing child processes or replacing a Trellis context builder.

### 6. Tests Required

Keep the original positive envelope assertions. Add deterministic red/green
regressions at the native process boundary, paired success/failure tests,
root-switch coverage, exact invocation assertions and nonfixture passthrough.
Any real-Python fixture smoke is separate from these timing-sensitive unit
contracts; run with the checkout interpreter, without guessed deadlines.
Package `tsc` includes only `src/`: validate VM-helper changes with a strict
TypeScript program that includes this test file and its imports as well.
Run Prettier explicitly on the test file; the package formatter targets `src/`.

### 7. Wrong vs Correct

```typescript
// Wrong: also bypasses Node child/protocol integration.
vi.mock("node:child_process", () => ({ spawnSync: vi.fn(), spawn: vi.fn() }));

// Correct: only a registered minimal context invocation gets fixture stdout.
// All other calls retain their original native API arguments.
if (!registeredContextInvocation) return childProcess.spawnSync(...call);
return contextSpawnSync ? contextSpawnSync(command, args, options) : fixtureResult;
```

---

## DO / DON'T

### DO

- Keep mock count minimal (currently 4 external dependencies)
- Use `vi.mocked(fn).mockClear()` between tests if asserting call counts
- Match mock return values to real API shapes

### DON'T

- Don't mock internal modules to force specific code paths
- Don't forget `vi.unstubAllGlobals()` when using `vi.stubGlobal`
- Don't assume mock state resets between tests without explicit `mockClear()` or `restoreAllMocks()`

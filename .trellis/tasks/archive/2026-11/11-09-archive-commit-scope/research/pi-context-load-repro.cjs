// Research-only probe. Reads unchanged product and uses disposable temp fixtures.
// Run from repo root: uv run --locked node <this-file> [parallelism]
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');

if (isMainThread) {
  const repo = process.cwd();
  const requireCli = createRequire(path.join(repo, 'packages/cli/package.json'));
  const ts = requireCli('typescript');
  const source = fs.readFileSync(path.join(repo, 'packages/cli/src/templates/pi/extensions/trellis/index.ts.txt'), 'utf8');
  const compiled = ts.transpileModule(source + '\nexport { trellisExtension };', {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const count = Number(process.argv[2] || '1');
  if (!Number.isInteger(count) || count < 1 || count > os.availableParallelism()) throw new Error('Count must be 1..availableParallelism');
  const gate = new SharedArrayBuffer(4);
  const workers = [];
  let ready = 0;
  let failed = 0;
  for (let id = 0; id < count; id++) {
    workers.push(new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: { id, repo, compiled, gate } });
      worker.on('message', (data) => {
        if (data.ready) {
          ready++;
          if (ready === count) { Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0); }
          return;
        }
        if (!data.workflow || !data.overview) failed++;
        console.log(JSON.stringify(data));
      });
      worker.on('error', reject);
      worker.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`worker exit ${code}`)));
    }));
  }
  Promise.all(workers).then(() => console.log(JSON.stringify({ summary: { workers: count, missingContext: failed } }))).catch((error) => { console.error(error); process.exitCode = 1; });
} else {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trellis-pi-355-research-'));
  fs.mkdirSync(path.join(root, '.pi'), { recursive: true });
  fs.mkdirSync(path.join(root, '.trellis', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, '.trellis', 'workflow.md'), '[workflow-state:no_task]\nNo active task. First classify the current turn and ask for task-creation consent before creating any Trellis task.\n[/workflow-state:no_task]\n');
  fs.writeFileSync(path.join(root, '.trellis', 'scripts', 'get_context.py'), [
    '#!/usr/bin/env python3', 'import sys', "if '--mode' in sys.argv and 'phase' in sys.argv:",
    "    print('## Phase Index\\nPhase 1: Plan')", 'else:', "    print('SESSION CONTEXT\\nCurrent task: none.')", '',
  ].join('\n'));
  const samples = [];
  const original = cp.spawnSync;
  cp.spawnSync = function(command, args, options) {
    const start = performance.now();
    const result = original.apply(this, arguments);
    if (args?.[0] === path.join(root, '.trellis', 'scripts', 'get_context.py')) samples.push({
      phase: args.includes('phase'), ms: Math.round(performance.now() - start), timeout: options?.timeout,
      status: result.status, signal: result.signal, error: result.error?.code,
      stdout: String(result.stdout || '').trim(), stderr: String(result.stderr || '').slice(0, 600),
    });
    return result;
  };
  const sandboxProcess = Object.create(process);
  const sandboxEnv = { ...process.env };
  // Execute the committed test setup, not hand-unset host-shell variables.
  const setup = fs.readFileSync(path.join(workerData.repo, 'packages/cli/test/setup.ts'), 'utf8');
  vm.runInNewContext(setup, { process: { env: sandboxEnv } });
  delete sandboxEnv.TRELLIS_SUBAGENT_CHILD;
  Object.defineProperty(sandboxProcess, 'cwd', { value: () => root });
  Object.defineProperty(sandboxProcess, 'env', { value: sandboxEnv });
  const moduleObject = { exports: {} };
  vm.runInNewContext(workerData.compiled, {
    Buffer, console, process: sandboxProcess, require: createRequire(path.join(workerData.repo, 'packages/cli/test/templates/pi.test.ts')),
    module: moduleObject, exports: moduleObject.exports,
  });
  const handlers = new Map();
  moduleObject.exports.trellisExtension({ on(event, handler) { handlers.set(event, handler); } });
  parentPort.postMessage({ ready: true });
  Atomics.wait(new Int32Array(workerData.gate), 0, 0, 10_000);
  const ctx = { sessionManager: { getSessionId: () => `pi-research-${workerData.id}` } };
  const first = handlers.get('before_agent_start')({ systemPrompt: 'BASE', prompt: 'Adjust service routing' }, ctx);
  const second = handlers.get('before_agent_start')({ systemPrompt: 'BASE', prompt: 'Continue' }, ctx);
  parentPort.postMessage({
    id: workerData.id, workflow: first.systemPrompt.includes('<trellis-workflow>'),
    phase: first.systemPrompt.includes('Phase 1: Plan'), overview: first.systemPrompt.includes('SESSION CONTEXT'),
    unchangedNextPrompt: second.systemPrompt === first.systemPrompt, samples,
  });
  // Only this probe's freshly-created fixture is removed.
  fs.rmSync(root, { recursive: true, force: true });
}

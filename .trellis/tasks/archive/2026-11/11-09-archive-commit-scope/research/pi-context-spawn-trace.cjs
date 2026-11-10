// Observation only: preserve arguments/results of every real spawnSync call.
const cp = require('node:child_process');
const { performance } = require('node:perf_hooks');
const original = cp.spawnSync;
cp.spawnSync = function (...args) {
  const contextCall = Array.isArray(args[1]) && args[1].some(value => typeof value === 'string' && /trellis-pi-355-.*get_context\.py/.test(value));
  const start = performance.now();
  const result = original.apply(this, args);
  if (contextCall) process.stderr.write(`[pi-research-spawn] ${JSON.stringify({
    pid: process.pid, phase: args[1].includes('phase'), command: args[0],
    ms: Math.round(performance.now() - start), timeout: args[2]?.timeout,
    status: result.status, signal: result.signal, error: result.error?.code,
    stdout: String(result.stdout ?? '').trim().slice(0, 180), stderr: String(result.stderr ?? '').slice(0, 600),
  })}\n`);
  return result;
};
require('node:module').syncBuiltinESMExports();

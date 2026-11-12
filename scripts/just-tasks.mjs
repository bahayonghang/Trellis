#!/usr/bin/env node
/**
 * Cross-platform body for the repo justfile.
 *
 * Shell recipes would split on PowerShell vs sh quoting. Every recipe calls
 * this file so Windows and Unix run the same commands.
 *
 * `install` is the fork switch: uninstall the published global package, then
 * write shims that execute this checkout. Not a copy — `just build` updates
 * what the global command runs.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliDir = path.join(repoRoot, "packages", "cli");
const pkg = JSON.parse(fs.readFileSync(path.join(cliDir, "package.json"), "utf8"));
const bins = Object.entries(pkg.bin).map(([name, rel]) => ({
  name,
  target: path.resolve(cliDir, rel),
}));
const MARKER = ".trellis-fork.json";
const BUILD_OUTPUTS = [
  "packages/core/dist/index.js",
  "packages/core/dist/channel/index.js",
  "packages/core/dist/task/index.js",
  "packages/cli/dist/index.js",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function quoteCmd(arg) {
  if (/[\s"&|<>^*]/.test(arg)) return `"${arg.replaceAll('"', '""')}"`;
  return arg;
}

function commandLine(command, args) {
  return [command, ...args].map(quoteCmd).join(" ");
}

function spawn(command, args, { inherit = false, cwd = repoRoot, timeout } = {}) {
  const options = {
    cwd,
    windowsHide: true,
    timeout,
    encoding: inherit ? undefined : "utf8",
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  };
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine(command, args)], options);
  }
  return spawnSync(command, args, options);
}

function run(command, args, options) {
  console.log(`> ${commandLine(command, args)}`);
  const result = spawn(command, args, { ...options, inherit: true });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(command, args) {
  return spawn(command, args, { inherit: false });
}

function lastLine(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.at(-1) || "";
}

function samePath(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function pointsAt(text, target) {
  const haystack = text.replaceAll("\\", "/").toLowerCase();
  const needle = target.replaceAll("\\", "/").toLowerCase();
  return haystack.includes(needle);
}

function npmBinDir() {
  const result = capture("npm", ["config", "get", "prefix"]);
  if (result.status !== 0) {
    fail(result.stderr || "npm config get prefix failed");
  }
  const prefix = lastLine(result.stdout);
  if (!prefix || !path.isAbsolute(prefix)) fail(`npm prefix is not absolute: ${prefix}`);
  return process.platform === "win32" ? prefix : path.join(prefix, "bin");
}

function pathRank(dir) {
  const target = path.resolve(dir).toLowerCase();
  return (process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .findIndex((entry) => path.resolve(entry).toLowerCase() === target);
}

function linkDirs() {
  const primary = npmBinDir();
  const dirs = [primary];
  const pnpmBin = capture("pnpm", ["bin", "-g"]);
  const extra = lastLine(pnpmBin.stdout);
  if (pnpmBin.status === 0 && extra && fs.existsSync(extra) && !samePath(extra, primary)) {
    if (pathRank(extra) >= 0) dirs.push(extra);
  }
  return dirs;
}

function shimFiles(dir, name) {
  if (process.platform === "win32") {
    return [path.join(dir, name), path.join(dir, `${name}.cmd`), path.join(dir, `${name}.ps1`)];
  }
  return [path.join(dir, name)];
}

function shShim(target) {
  const posix = target.replaceAll("\\", "/").replaceAll("'", "'\\''");
  return `#!/bin/sh\nexec node '${posix}' "$@"\n`;
}

function cmdShim(target) {
  return `@ECHO off\r\nnode "${target.replaceAll('"', '""')}" %*\r\n`;
}

function ps1Shim(target) {
  const literal = target.replaceAll("'", "''");
  return [
    "#!/usr/bin/env pwsh",
    `$target = '${literal}'`,
    "if ($MyInvocation.ExpectingInput) {",
    "  $input | & node $target @args",
    "} else {",
    "  & node $target @args",
    "}",
    "exit $LASTEXITCODE",
    "",
  ].join("\r\n");
}

function shimBody(filePath, target) {
  if (filePath.endsWith(".cmd")) return cmdShim(target);
  if (filePath.endsWith(".ps1")) return ps1Shim(target);
  return shShim(target);
}

function writeAtomic(filePath, content) {
  const tmp = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`,
  );
  fs.writeFileSync(tmp, content, "utf8");
  try {
    fs.rmSync(filePath, { force: true });
    fs.renameSync(tmp, filePath);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    throw error;
  }
}

function writeShims(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const bin of bins) {
    for (const filePath of shimFiles(dir, bin.name)) {
      writeAtomic(filePath, shimBody(filePath, bin.target));
      if (process.platform !== "win32" && !filePath.endsWith(".cmd") && !filePath.endsWith(".ps1")) {
        fs.chmodSync(filePath, 0o755);
      }
      console.log(`linked ${filePath}`);
    }
  }
  const payload = {
    kind: "trellis-fork",
    repo: repoRoot.replaceAll("\\", "/"),
    bins: bins.map((bin) => ({
      name: bin.name,
      target: bin.target.replaceAll("\\", "/"),
    })),
  };
  writeAtomic(path.join(dir, MARKER), `${JSON.stringify(payload, null, 2)}\n`);
}

function whereAll(name) {
  if (process.platform === "win32") {
    const result = capture("where.exe", [name]);
    if (result.status !== 0) return [];
    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const result = capture("which", ["-a", name]);
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function shellSource(name) {
  if (process.platform !== "win32") return null;
  const result = spawnSync(
    "pwsh.exe",
    ["-NoLogo", "-NoProfile", "-Command", `(Get-Command -Name '${name}').Source`],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) return null;
  return lastLine(result.stdout);
}

function resolvedOk(name, target) {
  const hits = whereAll(name);
  if (hits.length === 0) {
    console.error(`${name}: not on PATH`);
    return false;
  }
  const first = hits[0];
  let text = "";
  try {
    text = fs.readFileSync(first, "utf8");
  } catch (error) {
    console.error(`${name}: cannot read ${first}: ${error.message}`);
    return false;
  }
  let ok = pointsAt(text, target);
  console.log(`${name} -> ${first}${ok ? "" : " (not this checkout)"}`);
  if (ok && process.platform === "win32") {
    const dir = path.dirname(first);
    for (const filePath of shimFiles(dir, name)) {
      if (!fs.existsSync(filePath) || !pointsAt(fs.readFileSync(filePath, "utf8"), target)) {
        console.error(`${filePath} is missing or does not point at this checkout`);
        ok = false;
      }
    }
    const source = shellSource(name);
    if (source && (!fs.existsSync(source) || !pointsAt(fs.readFileSync(source, "utf8"), target))) {
      console.error(`pwsh resolves ${name} to ${source}, which does not point at this checkout`);
      ok = false;
    }
  }
  if (!ok) return false;
  for (const extra of hits.slice(1)) {
    let extraText = "";
    try {
      extraText = fs.readFileSync(extra, "utf8");
    } catch {
      extraText = "";
    }
    if (!pointsAt(extraText, target)) {
      console.log(`warning: later ${name} on PATH does not point at this checkout: ${extra}`);
    }
  }
  return true;
}

function probeCheckout() {
  const entry = path.join(cliDir, "dist", "cli", "index.js");
  if (!fs.existsSync(entry)) fail(`missing ${entry}; build did not produce the CLI`);
  for (const bin of bins) {
    if (!fs.existsSync(bin.target)) fail(`missing bin ${bin.target}`);
  }
  console.log(`> node ${bins[0].target} --version`);
  const result = spawnSync(process.execPath, [bins[0].target, "--version"], {
    cwd: repoRoot,
    stdio: "inherit",
    timeout: 30_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    fail("Refusing to replace the global trellis command because this checkout failed to start.");
  }
}

function removePublishedPackage() {
  // Always uninstall. npm tracks the bin names; leaving the published package
  // installed lets a later npm operation delete the fork shims.
  const result = spawn("npm", ["uninstall", "-g", "@mindfoldhq/trellis"], { inherit: true });
  if (result.error) fail(result.error.message);
  if (result.status === 0) return;
  const listed = capture("npm", ["ls", "-g", "--depth=0", "@mindfoldhq/trellis"]);
  const text = `${listed.stdout || ""}\n${listed.stderr || ""}`;
  if (text.includes("@mindfoldhq/trellis@")) {
    fail("npm uninstall -g @mindfoldhq/trellis failed and the published package is still installed.");
  }
  console.log("npm global @mindfoldhq/trellis was already absent");
}

function removePnpmGlobalIfPresent() {
  const root = capture("pnpm", ["root", "-g"]);
  if (root.status !== 0) return;
  const pkgDir = path.join(lastLine(root.stdout), "@mindfoldhq", "trellis");
  if (!fs.existsSync(pkgDir)) return;
  run("pnpm", ["remove", "-g", "@mindfoldhq/trellis"]);
}

function link() {
  probeCheckout();
  removePublishedPackage();
  removePnpmGlobalIfPresent();
  const dirs = linkDirs();
  for (const dir of dirs) {
    if (pathRank(dir) < 0) {
      console.log(`warning: ${dir} is not on PATH; shims written there will not run until it is`);
    }
    writeShims(dir);
  }
  let ok = true;
  for (const bin of bins) ok = resolvedOk(bin.name, bin.target) && ok;
  if (!ok) fail("Global command does not resolve to this checkout.");
  console.log("");
  console.log("This checkout is now the trellis on PATH.");
  console.log("Source edits need `just build` before the global command sees them.");
  console.log("`trellis upgrade` reinstalls the published npm package and removes this link.");
  console.log("Run `just install` again to restore it.");
}

function unlinkDir(dir) {
  let removed = 0;
  for (const bin of bins) {
    for (const filePath of shimFiles(dir, bin.name)) {
      if (!fs.existsSync(filePath)) continue;
      const text = fs.readFileSync(filePath, "utf8");
      if (!pointsAt(text, bin.target)) {
        console.log(`leave ${filePath} (does not point at this checkout)`);
        continue;
      }
      fs.rmSync(filePath, { force: true });
      console.log(`removed ${filePath}`);
      removed += 1;
    }
  }
  const markerPath = path.join(dir, MARKER);
  if (!fs.existsSync(markerPath)) return removed;
  let marker = null;
  try {
    marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  } catch {
    marker = null;
  }
  if (marker?.kind === "trellis-fork" && samePath(marker.repo, repoRoot)) {
    fs.rmSync(markerPath, { force: true });
    console.log(`removed ${markerPath}`);
  }
  return removed;
}

function uninstall() {
  const removed = linkDirs().reduce((count, dir) => count + unlinkDir(dir), 0);
  if (removed === 0) console.log("no shims for this checkout were installed");
  console.log("The published package was not reinstalled. Restore it with: npm install -g @mindfoldhq/trellis");
}

function which() {
  console.log(`repo: ${repoRoot}`);
  for (const bin of bins) console.log(`${bin.name} target: ${bin.target}`);
  let ok = true;
  for (const bin of bins) ok = resolvedOk(bin.name, bin.target) && ok;
  process.exit(ok ? 0 : 1);
}

function pythonCommand() {
  const names = process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"];
  for (const name of names) {
    const result = spawnSync(name, ["--version"], { stdio: "ignore", windowsHide: true });
    if (result.status === 0) return name;
  }
  fail("Python was not found. Use `python` on Windows or `python3` elsewhere.");
}

function pyCompile() {
  const listed = capture("git", ["ls-files", "--recurse-submodules", "*.py"]);
  if (listed.status !== 0) fail(listed.stderr || "git ls-files failed");
  const files = listed.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (files.length === 0) {
    console.log("no tracked Python files");
    return;
  }
  const python = pythonCommand();
  const batchSize = 40;
  for (let index = 0; index < files.length; index += batchSize) {
    run(python, ["-m", "py_compile", ...files.slice(index, index + batchSize)]);
  }
}

function verifyBuild() {
  const missing = BUILD_OUTPUTS.filter((rel) => !fs.existsSync(path.join(repoRoot, rel)));
  if (missing.length > 0) fail(`Build verification failed. Missing:\n${missing.join("\n")}`);
  console.log("Build verification passed");
}

function ci() {
  run("pnpm", ["install", "--frozen-lockfile"]);
  pyCompile();
  run("pnpm", ["typecheck"]);
  run("pnpm", ["--filter", "@mindfoldhq/trellis", "lint:py"]);
  run("pnpm", ["lint"]);
  run("pnpm", ["build"]);
  run("pnpm", ["test"]);
  verifyBuild();
}

const commands = {
  install() {
    run("pnpm", ["install"]);
    run("pnpm", ["build"]);
    link();
  },
  uninstall,
  which,
  deps() {
    run("pnpm", ["install"]);
  },
  build() {
    run("pnpm", ["build"]);
  },
  test() {
    run("pnpm", ["build"]);
    run("pnpm", ["test"]);
  },
  lint() {
    run("pnpm", ["lint"]);
    run("pnpm", ["--filter", "@mindfoldhq/trellis", "lint:py"]);
  },
  typecheck() {
    run("pnpm", ["typecheck"]);
  },
  fmt() {
    run("pnpm", ["--filter", "@mindfoldhq/trellis-core", "lint:fix"]);
    run("pnpm", ["--filter", "@mindfoldhq/trellis", "lint:fix"]);
    run("pnpm", ["--filter", "@mindfoldhq/trellis", "format"]);
  },
  clean() {
    run("pnpm", ["--filter", "@mindfoldhq/trellis-core", "clean"]);
    run("pnpm", ["--filter", "@mindfoldhq/trellis", "clean"]);
  },
  dev() {
    run("pnpm", ["--filter", "@mindfoldhq/trellis-core", "build"]);
    run("pnpm", ["--filter", "@mindfoldhq/trellis", "dev"]);
  },
  ci,
  "py-compile": pyCompile,
  "verify-build": verifyBuild,
};

const name = process.argv[2];
const command = commands[name];
if (!command) {
  console.error(`Usage: node scripts/just-tasks.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
command();

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { z } from "zod";
import {
  collectPlatformTemplates,
  getConfiguredPlatforms,
} from "../configurators/index.js";
import { getPythonCommandForPlatform } from "../configurators/shared.js";
import { AI_TOOLS, type AITool } from "../types/ai-tools.js";
import { loadHashes, getModificationStatus } from "../utils/template-hash.js";
import { detectProjectType } from "../utils/project-detector.js";

export const doctorCheckSchema = z.strictObject({
  id: z.string().min(1),
  status: z.enum(["ok", "warn", "error"]),
  confidence: z.enum(["configured", "probed", "host-verified"]),
  message: z.string().min(1),
  suggestion: z.string().min(1).optional(),
  details: z.array(z.string().max(500)).max(20).optional(),
});
export const doctorReportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  cwd: z.string().min(1),
  root: z.string().min(1).nullable(),
  checks: z.array(doctorCheckSchema),
});
export const doctorReportJsonSchema = z.toJSONSchema(doctorReportSchema);
export type DoctorCheck = z.infer<typeof doctorCheckSchema>;
export type DoctorReport = z.infer<typeof doctorReportSchema>;

const templates = fileURLToPath(new URL("../templates/", import.meta.url));
const probeSchema = z.strictObject({
  root: z.string().nullable(),
  identity: z.boolean(),
  task: z
    .strictObject({
      path: z.string().nullable(),
      stale: z.boolean(),
      invalid: z.boolean(),
    })
    .nullable(),
});
const hashesSchema = z.object({
  __version: z.literal(2),
  hashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/i)),
});
const repair =
  "Review your configuration, then run trellis update --dry-run; restore missing Trellis files with trellis update.";

function inside(base: string, candidate: string): boolean {
  const relative = path.relative(base, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

/** Contain existing ancestors too: a lexical child may pass through a link. */
function safePath(root: string, relative: string): string | null {
  if (
    !relative ||
    relative.includes("\0") ||
    relative.includes("\\") ||
    path.isAbsolute(relative) ||
    /^[A-Za-z]:/.test(relative) ||
    relative.split("/").some((part) => part === ".." || part === "." || !part)
  )
    return null;
  const target = path.join(root, relative);
  let ancestor = target;
  while (!fs.existsSync(ancestor)) {
    // A dangling link must not be mistaken for an ordinary missing leaf.
    try {
      if (fs.lstatSync(ancestor).isSymbolicLink()) return null;
    } catch {
      /* Missing ancestor. */
    }
    const parent = path.dirname(ancestor);
    if (parent === ancestor) return null;
    ancestor = parent;
  }
  const resolved = fs.realpathSync(ancestor);
  const rootReal = fs.realpathSync(root);
  if (inside(rootReal, resolved)) return target;
  if (
    relative.startsWith(".trellis/") &&
    inside(fs.realpathSync(path.join(root, ".trellis")), resolved)
  )
    return target;
  return null;
}

function readableFile(root: string, relative: string): boolean {
  const target = safePath(root, relative);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile())
    return false;
  fs.accessSync(target, fs.constants.R_OK);
  return true;
}

interface PythonProbe {
  executable: string;
  prefix: string[];
  version: string;
}
function pythonProbe(alias: string): PythonProbe | null {
  if (!["python", "python3", "py -3"].includes(alias)) return null;
  const [executable, ...prefix] = alias.split(" ");
  const result = spawnSync(
    executable,
    [...prefix, "-I", "-S", "-B", "--version"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
      windowsHide: true,
    },
  );
  const match = /Python (\d+)\.(\d+)\.(\d+)/.exec(
    result.stdout + result.stderr,
  );
  if (
    result.error ||
    result.status !== 0 ||
    !match ||
    Number(match[1]) < 3 ||
    (Number(match[1]) === 3 && Number(match[2]) < 9)
  )
    return null;
  return { executable, prefix, version: match[0] };
}

interface HookCommand {
  group: string;
  command: string;
  windows: boolean;
}
function hookCommands(value: unknown, route = "", matcher = ""): HookCommand[] {
  if (Array.isArray(value))
    return value.flatMap((item: unknown) => hookCommands(item, route, matcher));
  if (value === null || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const selectedMatcher =
    typeof record.matcher === "string" ? record.matcher : matcher;
  return Object.entries(record).flatMap(([key, item]) => {
    if (
      ["command", "commandWindows", "command_windows"].includes(key) &&
      typeof item === "string"
    )
      return [
        {
          group: `${route}#${selectedMatcher}`,
          command: item,
          windows: key !== "command",
        },
      ];
    return hookCommands(item, `${route}/${key}`, selectedMatcher);
  });
}

/** Static registration and known runtime probes only; never evaluate a hook. */
function platformChecks(root: string, platform: AITool): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const files = collectPlatformTemplates(platform) ?? new Map<string, string>();
  const id = `hooks.${platform}`;
  const add = (
    suffix: string,
    status: DoctorCheck["status"],
    confidence: DoctorCheck["confidence"],
    message: string,
    suggestion?: string,
  ): void => {
    checks.push({
      id: `${id}.${suffix}`,
      status,
      confidence,
      message,
      ...(suggestion ? { suggestion } : {}),
    });
  };
  let registrations = 0;
  const owned = loadHashes(root);
  const missingHookAssets = [...files.keys()].filter(
    (name) =>
      name.includes("/hooks/") &&
      owned[name] !== undefined &&
      !readableFile(root, name),
  );
  if (missingHookAssets.length)
    add(
      "assets",
      "error",
      "probed",
      `Missing or unsafe owned hook assets: ${missingHookAssets.slice(0, 3).join(", ")}`,
      repair,
    );
  for (const [name, content] of files) {
    if (!name.endsWith(".json")) continue;
    let expected: HookCommand[];
    try {
      expected = hookCommands(JSON.parse(content));
    } catch {
      continue;
    }
    if (!expected.length) continue;
    registrations += 1;
    if (!readableFile(root, name)) {
      add(
        name,
        "error",
        "configured",
        `${AI_TOOLS[platform].name} hook registration is missing or unsafe: ${name}`,
        repair,
      );
      continue;
    }
    let actual: HookCommand[];
    try {
      actual = hookCommands(
        JSON.parse(fs.readFileSync(path.join(root, name), "utf8")),
      );
    } catch {
      add(
        name,
        "error",
        "configured",
        `Invalid hook registration JSON: ${name}`,
        repair,
      );
      continue;
    }
    for (const group of new Set(expected.map((entry) => entry.group))) {
      const entries = actual.filter(
        (entry) => entry.group === group && !entry.windows,
      );
      if (!entries.length) {
        add(
          `${name}:${group}`,
          "error",
          "configured",
          `Missing hook registration ${group} in ${name}`,
          repair,
        );
        continue;
      }
      for (const [index, entry] of entries.entries()) {
        const key = `${name}:${group}:${index}`;
        if (entry.command.includes("{{PYTHON_CMD}}")) {
          add(
            key,
            "error",
            "configured",
            "Unresolved {{PYTHON_CMD}} in hook command.",
            repair,
          );
          continue;
        }
        const known = expected.some(
          (candidate) =>
            candidate.group === group &&
            (candidate.command === entry.command ||
              (platform === "codex" &&
                candidate.command.includes("base64.b64decode") &&
                candidate.command.replace(
                  /^(?:python3?|py -3) /,
                  "{{PYTHON_CMD}} ",
                ) ===
                  entry.command.replace(
                    /^(?:python3?|py -3) /,
                    "{{PYTHON_CMD}} ",
                  ))),
        );
        const relativePython =
          /^(python3?|py -3)(?: -X utf8)? (\.[\w./-]+\/hooks\/[\w./-]+\.py)$/.exec(
            entry.command,
          );
        if (!known && !relativePython) {
          add(
            key,
            "warn",
            "configured",
            `Custom hook command in ${name}; execution was not probed.`,
            "Review this command in the host's hook settings; doctor never executes user hooks.",
          );
          continue;
        }
        const script = /\.[\w./-]+\/hooks\/[\w./-]+\.(?:py|js)/.exec(
          entry.command,
        )?.[0];
        if (!script) {
          add(
            key,
            "warn",
            "configured",
            `Custom hook command in ${name}; execution was not probed.`,
            "Review this command in the host's hook settings; doctor never executes user hooks.",
          );
          continue;
        }
        if (!readableFile(root, script)) {
          add(
            key,
            "error",
            "probed",
            `Hook entrypoint is missing, unreadable or outside the workspace: ${script}`,
            repair,
          );
          continue;
        }
        const alias = /^(python3?|py -3)(?:\s|$)/.exec(entry.command)?.[1];
        if (script.endsWith(".py") && (!alias || !pythonProbe(alias))) {
          add(
            key,
            "error",
            "probed",
            `Hook Python alias cannot resolve Python >=3.9: ${alias ?? "unknown"}`,
            "Install Python >=3.9 on PATH and review the registered Python alias.",
          );
          continue;
        }
        const portable =
          platform === "codex" &&
          known &&
          entry.command.includes("base64.b64decode");
        add(
          key,
          portable ? "ok" : "warn",
          "probed",
          portable
            ? `Portable hook command and readable entrypoint: ${script}; host delivery is unverified.`
            : `Readable hook entrypoint ${script}; relative command depends on the host working directory.`,
          portable
            ? undefined
            : "Verify the host launches this relative command from the project root; review hook settings if it does not.",
        );
      }
    }
    if (
      actual.some(
        (entry) =>
          entry.windows ||
          !expected.some((candidate) => candidate.group === entry.group),
      )
    )
      add(
        `${name}:custom`,
        "warn",
        "configured",
        "Additional or Windows-specific custom registrations are present; their execution was not probed.",
        "Review custom registrations in the host's hook settings.",
      );
  }
  if (!registrations) {
    const assets = [...files.keys()].filter(
      (name) => owned[name] !== undefined,
    );
    const missing = assets.filter((name) => !readableFile(root, name));
    add(
      "assets",
      missing.length ? "error" : "ok",
      "configured",
      missing.length
        ? `${AI_TOOLS[platform].name}: ${missing.length} missing or unsafe owned plugin/prelude/command assets: ${missing.slice(0, 3).join(", ")}; host activation was not probed.`
        : `${AI_TOOLS[platform].name}: ${assets.length} owned plugin/prelude/command assets inspected; host activation was not probed.`,
      missing.length ? repair : undefined,
    );
  }
  return checks;
}

function ignoreChecks(root: string): DoctorCheck[] {
  const id = "hooks.local.ignore";
  const warn = (message: string, suggestion: string): DoctorCheck[] => [
    { id, status: "warn", confidence: "configured", message, suggestion },
  ];
  for (const name of [".trellis", ".trellis/.gitignore"]) {
    try {
      const stat = fs.lstatSync(path.join(root, name));
      if (
        stat.isSymbolicLink() ||
        (name.endsWith(".gitignore") && !stat.isFile())
      )
        return warn(
          `Ignore state is unprobed because ${name} is linked or nonregular.`,
          "Review hooks.local.json ignore rules without following or replacing the linked ignore file.",
        );
    } catch {
      return warn(
        "Local hook ignore file is missing or unreadable.",
        "Add hooks.local.json to .trellis/.gitignore, preserving existing rules.",
      );
    }
  }
  const git = (args: string[]): ReturnType<typeof spawnSync> =>
    spawnSync(
      "git",
      [
        "--no-optional-locks",
        "-c",
        "core.fsmonitor=false",
        "-C",
        root,
        ...args,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
        windowsHide: true,
      },
    );
  const tracked = git([
    "ls-files",
    "--error-unmatch",
    "--",
    ".trellis/hooks.local.json",
  ]);
  if (tracked.status === 0)
    return warn(
      ".trellis/hooks.local.json is already tracked; ignore rules cannot untrack it.",
      "Review and run git rm --cached -- .trellis/hooks.local.json to stop tracking it without deleting your local file.",
    );
  const ignored = git([
    "check-ignore",
    "--no-index",
    "--quiet",
    "--",
    ".trellis/hooks.local.json",
  ]);
  if (ignored.status === 0)
    return [
      {
        id,
        status: "ok",
        confidence: "probed",
        message: "Git ignores .trellis/hooks.local.json.",
      },
    ];
  if (ignored.status === 1)
    return warn(
      "Git does not ignore .trellis/hooks.local.json (later negations may override a rule).",
      "Add or review hooks.local.json in .trellis/.gitignore while preserving user rules.",
    );
  return warn(
    "Git ignore matching was not probed (Git unavailable or this is not a Git workspace).",
    "Check the hooks.local.json rule when Git is available; doctor has not modified it.",
  );
}

export function collectDoctorReport(cwd = process.cwd()): DoctorReport {
  const report: DoctorReport = {
    schemaVersion: 1,
    cwd: path.resolve(cwd),
    root: null,
    checks: [],
  };
  const add = (
    id: string,
    status: DoctorCheck["status"],
    confidence: DoctorCheck["confidence"],
    message: string,
    suggestion?: string,
    details?: string[],
  ): void => {
    report.checks.push({
      id,
      status,
      confidence,
      message,
      ...(suggestion ? { suggestion } : {}),
      ...(details
        ? {
            details: details.slice(0, 20).map((detail) => detail.slice(0, 500)),
          }
        : {}),
    });
  };
  try {
    const metadata = JSON.parse(
      fs.readFileSync(
        fileURLToPath(new URL("../../package.json", import.meta.url)),
        "utf8",
      ),
    ) as { engines: { node: string } };
    const minimum =
      /\d+\.\d+\.\d+/.exec(metadata.engines.node)?.[0] ?? "18.17.0";
    const nodeOk =
      process.versions.node
        .split(".")
        .reduce(
          (comparison, part, index) =>
            comparison ||
            Math.sign(Number(part) - Number(minimum.split(".")[index])),
          0,
        ) >= 0;
    add(
      "runtime.node",
      nodeOk ? "ok" : "error",
      "probed",
      `Node ${process.versions.node}; packaged minimum ${minimum}.`,
      nodeOk ? undefined : `Use Node >=${minimum}.`,
    );
    const alias = getPythonCommandForPlatform();
    const python = pythonProbe(alias);
    add(
      "runtime.python",
      python ? "ok" : "error",
      "probed",
      python
        ? `${alias} resolves ${python.version}; {{PYTHON_CMD}} can render to this alias.`
        : `${alias} cannot resolve Python >=3.9.`,
      python
        ? undefined
        : "Install Python >=3.9 on PATH and rerun trellis doctor.",
    );
    if (!python) {
      add(
        "project.root",
        "warn",
        "configured",
        "Root and session probes require a working Python alias.",
        "Restore Python >=3.9, then rerun trellis doctor.",
      );
      return doctorReportSchema.parse(report);
    }
    const probe = spawnSync(
      python.executable,
      [
        ...python.prefix,
        "-I",
        "-S",
        "-B",
        path.join(templates, "doctor/probe.py"),
        report.cwd,
      ],
      {
        cwd: report.cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
        windowsHide: true,
      },
    );
    if (probe.error || probe.status !== 0) {
      add(
        "project.root",
        "error",
        "probed",
        "Trusted root/session probe failed.",
        "Rebuild or reinstall this Trellis CLI; no project Python was executed.",
      );
      return doctorReportSchema.parse(report);
    }
    const result = probeSchema.parse(JSON.parse(probe.stdout));
    report.root = result.root;
    if (!result.root) {
      add(
        "project.root",
        "warn",
        "probed",
        "No valid Trellis workspace ancestor was found.",
        "Run from a Trellis project, or run trellis init to create one.",
      );
      return doctorReportSchema.parse(report);
    }
    const root = result.root;
    add(
      "project.root",
      "ok",
      "probed",
      `Nearest canonical Trellis workspace: ${root}`,
    );
    add(
      "project.type",
      "ok",
      "probed",
      `Detected project type: ${detectProjectType(root)}.`,
    );
    const workflow = readableFile(root, ".trellis/workflow.md");
    add(
      "project.workflow",
      workflow ? "ok" : "error",
      "probed",
      workflow
        ? "Workflow is readable."
        : ".trellis/workflow.md is missing, unreadable or unsafe.",
      workflow
        ? undefined
        : "Restore .trellis/workflow.md with trellis workflow --list and a reviewed template selection, or trellis update.",
    );
    const taskError =
      result.task !== null && (result.task.stale || result.task.invalid);
    add(
      "task.current",
      taskError ? "error" : result.identity ? "ok" : "warn",
      "probed",
      taskError
        ? `Current session task pointer is stale or invalid: ${result.task?.path ?? "unknown"}`
        : result.identity
          ? `Current session task: ${result.task?.path ?? "none"}.`
          : "No session identity is known; no task was inferred from other sessions or shell tickets.",
      taskError
        ? `Run ${alias} .trellis/scripts/task.py current --source, then task.py finish to clear the stale session pointer or task.py start <task> to select a valid task.`
        : undefined,
    );
    const manifest = safePath(root, ".trellis/.template-hashes.json");
    let owned = false;
    if (manifest && readableFile(root, ".trellis/.template-hashes.json")) {
      try {
        owned = hashesSchema.safeParse(
          JSON.parse(fs.readFileSync(manifest, "utf8")),
        ).success;
      } catch {
        /* Invalid manifest is diagnosed without repair. */
      }
    }
    add(
      "templates.hashes",
      owned ? "ok" : "warn",
      "configured",
      owned
        ? "Stored template ownership hashes are readable."
        : "Template ownership metadata is missing, invalid or unsafe; native config directories alone do not establish Trellis configuration.",
      owned
        ? undefined
        : "Review .trellis/.template-hashes.json and trellis update --dry-run; doctor will not initialize or repair ownership.",
    );
    if (owned) {
      const hashes = loadHashes(root);
      const names = Object.keys(hashes);
      const unsafe = names.filter((name) => !safePath(root, name));
      const missing = names.filter(
        (name) => safePath(root, name) && !readableFile(root, name),
      );
      const readable = names.filter(
        (name) => !unsafe.includes(name) && !missing.includes(name),
      );
      const changed = [...getModificationStatus(root, readable, hashes)]
        .filter(([, modified]) => modified)
        .map(([name]) => name);
      add(
        "templates.drift",
        unsafe.length
          ? "error"
          : missing.length || changed.length
            ? "warn"
            : "ok",
        "probed",
        `Local stored-hash drift: ${changed.length} modified, ${missing.length} missing, ${unsafe.length} unsafe paths; this is not an upstream freshness check.`,
        changed.length || missing.length || unsafe.length
          ? "Review the listed paths and trellis update --dry-run; preserve intentional local edits."
          : undefined,
        [
          ...unsafe.map((name) => `unsafe: ${name}`),
          ...missing.map((name) => `missing: ${name}`),
          ...changed.map((name) => `modified: ${name}`),
        ],
      );
      const platforms = getConfiguredPlatforms(root);
      add(
        "platforms.configured",
        platforms.size ? "ok" : "warn",
        "configured",
        platforms.size
          ? `Trellis-owned platforms: ${[...platforms].map((id) => AI_TOOLS[id].name).join(", ")}.`
          : "No platform has recorded Trellis-owned templates.",
        platforms.size
          ? undefined
          : "Review trellis platforms --json and your intended trellis init platform selection.",
      );
      for (const platform of platforms)
        report.checks.push(...platformChecks(root, platform));
    }
    report.checks.push(...ignoreChecks(root));
  } catch (error) {
    add(
      "doctor.inspection",
      "error",
      "configured",
      `Local inspection failed: ${String(error instanceof Error ? error.message : error).slice(0, 500)}`,
      "Review the diagnostic input and rebuild/reinstall Trellis if the packaged probe is missing; doctor did not repair files.",
    );
  }
  return doctorReportSchema.parse(report);
}

export function doctor(options: { json?: boolean } = {}): void {
  const report = collectDoctorReport();
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(chalk.bold("Trellis doctor"));
    for (const check of report.checks) {
      const color =
        check.status === "error"
          ? chalk.red
          : check.status === "warn"
            ? chalk.yellow
            : chalk.green;
      console.log(
        color(
          `${check.status} [${check.confidence}] ${check.id}: ${check.message}`,
        ),
      );
      if (check.suggestion) console.log(`  ${check.suggestion}`);
      for (const detail of check.details ?? []) console.log(`  ${detail}`);
    }
  }
  process.exitCode = report.checks.some((check) => check.status === "error")
    ? 1
    : 0;
}

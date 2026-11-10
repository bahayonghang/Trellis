import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  collectPlatformTemplates,
  configurePlatform,
  PLATFORM_IDS,
} from "../../src/configurators/index.js";
import { getStatuslineHook } from "../../src/templates/claude/index.js";
import {
  SHARED_HOOKS_BY_PLATFORM,
  getSharedHookScripts,
} from "../../src/templates/shared-hooks/index.js";

const PYTHON = process.platform === "win32" ? "python" : "python3";
const TEMPLATES = fileURLToPath(
  new URL("../../src/templates/", import.meta.url),
);
const HOOKS = [
  ".claude/hooks/session-start.py",
  ".claude/hooks/inject-workflow-state.py",
  ".claude/hooks/inject-subagent-context.py",
  ".cursor/hooks/inject-shell-session-context.py",
  ".codex/hooks/session-start.py",
  ".github/copilot/hooks/session-start.py",
  ".claude/hooks/statusline.py",
  ".snow/hooks/write-trellis-context.py",
];
interface Result {
  code: number | null;
  stdout: string;
  stderr: string;
  killed: boolean;
}
let root: string;
let caller: string;

function write(relative: string, content: string): void {
  const dest = path.join(root, relative);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

// Use real installed maps, never a source-only script with missing support files.
function installHooks(): void {
  fs.mkdirSync(path.join(root, ".git"));
  write(".trellis/spec/guides/index.md", "# Stdin fixture guides\n");
  for (const platform of [
    "claude-code",
    "cursor",
    "codex",
    "copilot",
    "snow",
  ] as const) {
    for (const [name, content] of collectPlatformTemplates(platform) ?? []) {
      if (name.includes("/hooks/")) write(name, content);
    }
  }
  write(".claude/hooks/statusline.py", getStatuslineHook());
  fs.cpSync(
    path.join(TEMPLATES, "trellis/scripts"),
    path.join(root, ".trellis/scripts"),
    { recursive: true },
  );
  write(
    ".trellis/workflow.md",
    "# Workflow\n[workflow-state:no_task]\nstdin-control\n[/workflow-state:no_task]\n",
  );
  write(
    ".trellis/config.yaml",
    "prompt_injection:\n  skip_keyword: skipguard\n",
  );
}

function payload(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    cwd: root,
    session_id: "stdin-control",
    sessionId: "stdin-control",
    model: { display_name: "stdin-model" },
    tool_name: "Agent",
    tool_input: { subagent_type: "trellis-research", prompt: "stdin-control" },
    command: "python ./.trellis/scripts/task.py current --source",
    ...extra,
  });
}

async function run(
  hook: string,
  input: string | Buffer | null,
  options: {
    open?: boolean;
    delay?: number;
    env?: NodeJS.ProcessEnv;
    chunks?: Buffer[];
  } = {},
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      PYTHON,
      [
        path.join(root, hook),
        ...(hook.includes("write-trellis") ? ["user"] : []),
      ],
      {
        cwd: caller,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "1.2",
          ...options.env,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let killed = false;
    child.stdout.setEncoding("utf8").on("data", (s: string) => {
      stdout += s;
    });
    child.stderr.setEncoding("utf8").on("data", (s: string) => {
      stderr += s;
    });
    child.stdin.on("error", () => {
      /* An old hook may exit before delayed input. */
    });
    child.on("error", reject);
    const safety = setTimeout(() => {
      killed = true;
      child.kill();
    }, 5000);
    const send = setTimeout(() => {
      if (options.chunks) {
        for (const chunk of options.chunks) child.stdin.write(chunk);
      } else if (input !== null) child.stdin.write(input);
      if (!options.open) child.stdin.end();
    }, options.delay ?? 0);
    child.on("close", (code) => {
      clearTimeout(safety);
      clearTimeout(send);
      child.stdin.destroy();
      resolve({ code, stdout: stdout.replace(/\r\n/g, "\n"), stderr, killed });
    });
  });
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-stdin-"));
  caller = root;
  installHooks();
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("all installed Python hook stdin boundaries", () => {
  it.each(HOOKS)(
    "%s terminates natively while an empty pipe stays open",
    async (hook) => {
      const result = await run(hook, null, {
        open: true,
        env: {
          TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "0.15",
          TRELLIS_HOOK_INPUT_DEBUG: "1",
        },
      });
      expect(result.killed, result.stderr).toBe(false);
      expect(result.code, result.stderr).toBe(0);
      expect(result.stderr).toContain("[trellis-hook-input:timeout]");
      expect(result.stderr).not.toContain("Fatal Python error");
    },
  );

  it.each(HOOKS)(
    "%s preserves closed-pipe output when complete JSON arrives after 0.5s and stays open",
    async (hook) => {
      const input = payload(
        hook.includes("workflow-state") ? { prompt: "skipguard" } : {},
      );
      const control = await run(hook, input);
      expect(control.code, control.stderr).toBe(0);
      if (hook.includes("subagent"))
        expect(control.stdout).toContain("# Research Agent Task");
      const delayed = await run(hook, input, { open: true, delay: 500 });
      expect(delayed.killed, delayed.stderr).toBe(false);
      expect(delayed.code, delayed.stderr).toBe(0);
      expect(delayed.stderr).toBe("");
      expect(delayed.stdout).toBe(control.stdout);
    },
  );

  it.each([
    ["", "empty"],
    ["{secret-broken", "invalid-json"],
    ["[]", "non-object"],
  ])(
    "diagnoses %j as %s without exposing payloads",
    async (input, category) => {
      for (const hook of HOOKS) {
        const result = await run(hook, input, {
          env: { TRELLIS_HOOK_INPUT_DEBUG: "1" },
        });
        expect(result.code, `${hook}: ${result.stderr}`).toBe(0);
        expect(result.stderr, hook).toContain(
          `[trellis-hook-input:${category}]`,
        );
        expect(result.stderr).not.toContain("secret-broken");
      }
    },
  );

  it("keeps default stderr silent for malformed input", async () => {
    for (const hook of HOOKS) {
      const result = await run(hook, "{broken");
      expect(result.code, result.stderr).toBe(0);
      expect(result.stderr).toBe("");
    }
  });

  it("reads multi-megabyte Unicode through chunk boundaries without losing context", async () => {
    const huge = payload({
      padding: "中🧪".repeat(400_000),
      prompt: "skipguard",
    });
    const buffer = Buffer.from(huge);
    expect(buffer.length).toBeGreaterThan(2 * 1024 * 1024);
    const chunks = [
      buffer.subarray(0, 31),
      buffer.subarray(31, 4097),
      buffer.subarray(4097),
    ];
    const hook = ".claude/hooks/inject-workflow-state.py";
    const control = await run(hook, payload({ prompt: "skipguard" }));
    const result = await run(hook, null, { open: true, chunks });
    expect(result.killed, result.stderr).toBe(false);
    expect(result.code, result.stderr).toBe(0);
    expect(control.stdout).toBe("");
    expect(result.stdout).toBe(control.stdout);
  });

  it.each(["{ }", "host wrapper\n{ }\nend wrapper"])(
    "recognizes an empty Snow object %j before EOF rather than treating it as a timeout",
    async (input) => {
      const result = await run(".snow/hooks/write-trellis-context.py", input, {
        open: true,
        env: {
          TRELLIS_HOOK_STDIN_TIMEOUT_SECONDS: "0.15",
          TRELLIS_HOOK_INPUT_DEBUG: "1",
        },
      });
      expect(result.code, result.stderr).toBe(0);
      expect(result.killed).toBe(false);
      expect(result.stderr).toBe("");
    },
  );

  it("preserves Snow's wrapped JSON input", async () => {
    const hook = ".snow/hooks/write-trellis-context.py";
    const control = await run(hook, payload());
    const wrapped = await run(hook, `host wrapper\n${payload()}\nend wrapper`);
    expect(wrapped.code, wrapped.stderr).toBe(0);
    expect(wrapped.stdout).toBe(control.stdout);
  });
});

describe("hook reader installation ownership", () => {
  it("every Python input consumer receives the canonical support asset before its entrypoint", () => {
    const canonical = fs.readFileSync(
      path.join(TEMPLATES, "shared-hooks/trellis_hook_input.py"),
      "utf8",
    );
    for (const platform of PLATFORM_IDS) {
      const files = collectPlatformTemplates(platform);
      const keys = [...(files?.keys() ?? [])];
      for (const [name, content] of files ?? []) {
        if (
          !name.endsWith(".py") ||
          !content.includes("from trellis_hook_input import")
        )
          continue;
        const helper = `${name.slice(0, name.lastIndexOf("/"))}/trellis_hook_input.py`;
        expect(files?.get(helper), `${platform}: ${helper}`).toBe(canonical);
        expect(
          keys.indexOf(helper),
          `${platform}: helper must precede ${name}`,
        ).toBeLessThan(keys.indexOf(name));
      }
    }
    expect(getSharedHookScripts().map((h) => h.name)).not.toContain(
      "trellis_hook_input.py",
    );
    expect(Object.values(SHARED_HOOKS_BY_PLATFORM).flat()).not.toContain(
      "trellis_hook_input.py",
    );
  });

  it("opt-in Claude statusline has its helper without making statusline a default update asset", async () => {
    await configurePlatform("claude-code", root, { withStatusline: true });
    expect(
      fs.existsSync(path.join(root, ".claude/hooks/trellis_hook_input.py")),
    ).toBe(true);
    expect(
      collectPlatformTemplates("claude-code")?.has(
        ".claude/hooks/statusline.py",
      ),
    ).toBe(false);
  });
});

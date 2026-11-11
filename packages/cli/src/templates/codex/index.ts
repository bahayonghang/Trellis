/**
 * Codex templates
 *
 * These are GENERIC templates for user projects.
 * Do NOT use Trellis project's own .agents/skills or .codex directories
 * (which may be customized).
 *
 * Workflow skills are NOT stored here. They come from templates/common/ and are
 * written to .agents/skills/ as trellis-*, which Codex reads alongside
 * .codex/skills/ (see configurators/codex.ts).
 *
 * Directory structure:
 *   codex/
 *   ├── agents/         # Project-scoped Codex custom agents (.toml)
 *   ├── hooks/          # Codex hook scripts → .codex/hooks/
 *   ├── hooks.json      # Codex hook wiring → .codex/hooks.json
 *   └── config.toml     # Project-scoped Codex config
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getSharedHookSupportFiles } from "../shared-hooks/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readTemplate(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), "utf-8");
}

function listFiles(dir: string): string[] {
  try {
    return readdirSync(join(__dirname, dir)).sort();
  } catch {
    return [];
  }
}

export interface AgentTemplate {
  name: string;
  content: string;
}

export interface ConfigTemplate {
  targetPath: string;
  content: string;
}

// Shared skills are now sourced from common/ templates (see templates/common/index.ts)

export function getAllAgents(): AgentTemplate[] {
  const agents: AgentTemplate[] = [];

  for (const file of listFiles("agents")) {
    if (!file.endsWith(".toml")) {
      continue;
    }

    const name = file.replace(".toml", "");
    const content = readTemplate(`agents/${file}`);
    agents.push({ name, content });
  }

  return agents;
}

export interface HookTemplate {
  name: string;
  content: string;
}

export function getAllHooks(): HookTemplate[] {
  const hooks: HookTemplate[] = [];

  for (const file of listFiles("hooks")) {
    if (!file.endsWith(".py")) {
      continue;
    }
    hooks.push({ name: file, content: readTemplate(`hooks/${file}`) });
  }

  return hooks;
}

export function getHooksConfig(): string {
  const config = JSON.parse(readTemplate("hooks.json")) as {
    hooks: Record<string, { hooks: { command: string }[] }[]>;
  };
  for (const handlers of Object.values(config.hooks)) {
    for (const handler of handlers) {
      for (const hook of handler.hooks) {
        const script = CODEX_HOOK_SCRIPTS.find(
          (name) => hook.command === `{{PYTHON_CMD}} -X utf8 ${name}`,
        );
        if (script) hook.command = buildCodexHookCommand(script);
      }
    }
  }
  return JSON.stringify(config, null, 2) + "\n";
}

export const CODEX_HOOK_SCRIPTS = [
  ".codex/hooks/inject-workflow-state.py",
  ".codex/hooks/inject-subagent-context.py",
] as const;

/** Fixed source only; stdin and cwd remain owned by the original hook. */
export function getCodexHookBootstrapSource(): string {
  const canonical = getSharedHookSupportFiles().find(
    (file) => file.name === "trellis_hook_paths.py",
  );
  if (!canonical) throw new Error("Missing canonical hook workspace discovery");
  return (
    canonical.content +
    `
import runpy
import sys

_scripts = (
    ".codex/hooks/inject-workflow-state.py",
    ".codex/hooks/inject-subagent-context.py",
)
if len(sys.argv) == 2 and sys.argv[1] in _scripts:
    _root = find_trellis_root(Path.cwd())
    if _root is not None:
        _target = _root / sys.argv[1]
        if _target.is_file() and all(
            (_target.parent / name).is_file()
            for name in ("trellis_hook_input.py", "trellis_hook_paths.py")
        ):
            sys.path.insert(0, str(_target.parent))
            sys.argv = [str(_target)]
            runpy.run_path(str(_target), run_name="__main__")
`
  );
}

export function buildCodexHookCommand(
  script: (typeof CODEX_HOOK_SCRIPTS)[number],
): string {
  const encoded = Buffer.from(getCodexHookBootstrapSource(), "utf-8").toString(
    "base64",
  );
  return `{{PYTHON_CMD}} -X utf8 -c "import base64;exec(base64.b64decode('${encoded}'))" ${script}`;
}

export function getConfigTemplate(): ConfigTemplate {
  return {
    targetPath: "config.toml",
    content: readTemplate("config.toml"),
  };
}

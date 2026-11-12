import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gitignoreTemplate } from "../templates/trellis/index.js";

export const TRELLIS_GITIGNORE_PATH = ".trellis/.gitignore";

/** Add only this rule, before user rules so their negations retain precedence. */
export function addLocalHooksIgnoreRule(existing: string): string {
  const bom = existing.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = existing.slice(bom.length);
  if (
    body
      .split(/\r?\n/)
      .some((line) => /^\/?hooks\.local\.json[ \t]*$/.test(line))
  ) {
    return existing;
  }
  const newline = existing.includes("\r\n") ? "\r\n" : "\n";
  return `${bom}hooks.local.json${newline}${body}`;
}

/** Read-only plan; links and nonregular paths are never followed. */
export function planLocalHooksGitignore(cwd: string): string | null {
  const workflow = path.join(cwd, ".trellis");
  const workflowStat = fs.lstatSync(workflow, { throwIfNoEntry: false });
  if (
    workflowStat &&
    (workflowStat.isSymbolicLink() || !workflowStat.isDirectory())
  ) {
    console.warn(
      `Skipped ${TRELLIS_GITIGNORE_PATH}: .trellis is a symlink or non-directory.`,
    );
    return null;
  }

  try {
    // Fixed command: no user input is interpolated, and the index is read-only.
    const tracked = execSync("git ls-files -- .trellis/hooks.local.json", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    if (tracked.trim() === ".trellis/hooks.local.json") {
      console.warn(
        ".trellis/hooks.local.json is already tracked. To untrack it, run: git rm --cached -- .trellis/hooks.local.json",
      );
    }
  } catch {
    // Git may be unavailable or this may be a non-Git project.
  }

  const target = path.join(cwd, TRELLIS_GITIGNORE_PATH);
  const stat = workflowStat
    ? fs.lstatSync(target, { throwIfNoEntry: false })
    : undefined;
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) {
    console.warn(
      `Skipped ${TRELLIS_GITIGNORE_PATH}: it is a symlink or nonregular file.`,
    );
    return null;
  }
  return stat
    ? addLocalHooksIgnoreRule(fs.readFileSync(target, "utf-8"))
    : gitignoreTemplate;
}

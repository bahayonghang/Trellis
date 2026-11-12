import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { PACKAGE_NAME, VERSION } from "../constants/version.js";

export interface UpgradeOptions {
  tag?: string;
  dryRun?: boolean;
  forceNpm?: boolean;
}

interface SpawnResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
}

interface SpawnOptions {
  stdio: "inherit";
  shell: false;
}

type SpawnRunner = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => SpawnResult;

export interface UpgradeCommandPlan {
  command: string;
  args: string[];
  spawnOptions: SpawnOptions;
  displayCommand: string;
  target: string;
  tag: string;
  binaryCheckCommand: string;
}

const NPM_TAG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function findCheckoutRoot(
  modulePath: string = fileURLToPath(import.meta.url),
): string | null {
  let directory = path.dirname(fs.realpathSync(modulePath));
  if (directory.split(path.sep).includes("node_modules")) return null;

  while (true) {
    if (fs.existsSync(path.join(directory, ".git"))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

export function resolveUpgradeTag(
  currentVersion: string = VERSION,
  requestedTag?: string,
): string {
  if (requestedTag) {
    if (!NPM_TAG_RE.test(requestedTag)) {
      throw new Error(
        `Invalid npm tag/version "${requestedTag}". Use a simple dist-tag or version such as latest, beta, rc, or 0.6.0-beta.8.`,
      );
    }
    return requestedTag;
  }

  if (currentVersion.includes("-beta")) return "beta";
  if (currentVersion.includes("-rc")) return "rc";
  return "latest";
}

function binaryCheckCommand(
  platform: NodeJS.Platform = process.platform,
): string {
  return platform === "win32" ? "where trellis" : "which trellis";
}

export function buildUpgradeCommand(
  options: UpgradeOptions = {},
  currentVersion: string = VERSION,
  platform: NodeJS.Platform = process.platform,
): UpgradeCommandPlan {
  const tag = resolveUpgradeTag(currentVersion, options.tag);
  const target = `${PACKAGE_NAME}@${tag}`;
  const npmArgs = ["install", "-g", target];
  const displayCommand = `npm ${npmArgs.join(" ")}`;
  const spawnOptions: SpawnOptions = { stdio: "inherit", shell: false };

  if (platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", displayCommand],
      spawnOptions,
      displayCommand,
      target,
      tag,
      binaryCheckCommand: binaryCheckCommand(platform),
    };
  }

  return {
    command: "npm",
    args: npmArgs,
    spawnOptions,
    displayCommand,
    target,
    tag,
    binaryCheckCommand: binaryCheckCommand(platform),
  };
}

function troubleshooting(plan: UpgradeCommandPlan): string {
  return [
    "",
    "Troubleshooting:",
    `- Manual command: ${plan.displayCommand}`,
    "- Check npm global prefix and PATH: npm config get prefix",
    `- Check which Trellis binary your shell resolves: ${plan.binaryCheckCommand}`,
    "- If this is a permissions error, fix your Node/npm install or npm prefix; Trellis does not run sudo.",
    "- If npm reports an existing binary or locked file, resolve that npm error manually; Trellis does not run --force.",
  ].join("\n");
}

export async function upgrade(
  options: UpgradeOptions = {},
  runner: SpawnRunner = spawnSync,
  modulePath: string = fileURLToPath(import.meta.url),
): Promise<void> {
  const plan = buildUpgradeCommand(options);
  const checkoutRoot = findCheckoutRoot(modulePath);

  if (checkoutRoot || options.dryRun) {
    console.log(
      chalk.gray(
        checkoutRoot
          ? `CLI source: git checkout (${checkoutRoot})`
          : "CLI source: package installation (no git checkout detected)",
      ),
    );
  }

  if (checkoutRoot && !options.forceNpm) {
    const message = [
      "Refusing npm upgrade from a git checkout.",
      "Update this checkout with git pull, then just build (or just install).",
      "To install the official npm package instead, explicitly pass --force-npm.",
    ].join("\n");
    if (!options.dryRun) throw new Error(message);
    console.log(chalk.yellow(message));
    console.log(
      chalk.gray(
        "Dry run: npm installation would be blocked; no changes made.",
      ),
    );
    return;
  }

  if (checkoutRoot) {
    console.log(
      chalk.yellow(
        "--force-npm: replacing the checkout link with the official npm package.",
      ),
    );
  }

  console.log(chalk.cyan(`Upgrading Trellis CLI to ${plan.target}`));
  console.log(chalk.gray(`Run: ${plan.displayCommand}`));

  if (options.dryRun) {
    console.log(chalk.gray("Dry run: no changes made."));
    return;
  }

  const result = runner(plan.command, plan.args, plan.spawnOptions);
  if (result.error) {
    throw new Error(
      `Failed to run npm. Install npm or run manually: ${plan.displayCommand}${troubleshooting(plan)}`,
    );
  }
  if (result.signal) {
    throw new Error(
      `npm install was interrupted by ${result.signal}.${troubleshooting(plan)}`,
    );
  }
  if (result.status === null) {
    throw new Error(
      `npm install failed without an exit status.${troubleshooting(plan)}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `npm install failed with exit code ${result.status}.${troubleshooting(plan)}`,
    );
  }

  console.log(chalk.green("\n✓ Trellis CLI upgrade completed"));
  console.log(chalk.gray("Run: trellis --version"));
  console.log(chalk.gray(`Run: ${plan.binaryCheckCommand}`));
}

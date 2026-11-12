import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renameSyncWithRetry } from "../../src/utils/rename.js";

// Exact schedules control only the external syscall and clock. Real publication
// below and in the callers' tests keeps native rename AND production waiting.
describe("renameSyncWithRetry", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-rename-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each(
    ["EPERM", "EACCES", "EBUSY"].flatMap((code) =>
      [0, 2, 10].map((failures) => ({ code, failures })),
    ),
  )(
    "controlled $code success after $failures failures",
    ({ code, failures }) => {
      vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      // Native-success canary: these paths do not exist. Delegating the supposed
      // success branch to the OS would throw ENOENT, not satisfy this contract.
      const source = path.join(dir, "missing-source");
      const target = path.join(dir, "missing-target");
      let attempts = 0;
      const rename = vi.spyOn(fs, "renameSync").mockImplementation(() => {
        if (attempts++ < failures)
          throw Object.assign(new Error("controlled lock"), { code });
      });
      const wait = vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");

      renameSyncWithRetry(source, target);

      expect(rename.mock.calls).toEqual(
        Array.from({ length: failures + 1 }, () => [source, target]),
      );
      expect(wait.mock.calls.map((call) => call[3])).toEqual(
        Array.from({ length: failures }, (_, i) => 10 * (i + 1)),
      );
      expect(fs.readdirSync(dir)).toEqual([]);
    },
  );

  it.each(["EPERM", "EACCES", "EBUSY"])(
    "caps controlled %s failures at 11 attempts and throws the exact final error",
    (code) => {
      vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      const failures = Array.from({ length: 11 }, (_, i) =>
        Object.assign(new Error(`lock ${i}`), { code }),
      );
      let attempts = 0;
      const rename = vi.spyOn(fs, "renameSync").mockImplementation(() => {
        throw failures[attempts++];
      });
      const wait = vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");
      let caught: unknown;
      try {
        renameSyncWithRetry("source", "target");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(failures[10]);
      expect(rename).toHaveBeenCalledTimes(11);
      expect(wait.mock.calls.map((call) => call[3])).toEqual([
        10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
      ]);
    },
  );

  it.each(["file", "directory"])(
    "publishes a real %s with exact bytes and production waiting",
    (kind) => {
      vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      const source = path.join(dir, "source");
      const target = path.join(dir, "target");
      if (kind === "directory") fs.mkdirSync(source);
      fs.writeFileSync(
        kind === "directory" ? path.join(source, "data") : source,
        "exact bytes",
      );
      renameSyncWithRetry(source, target);

      expect(fs.readdirSync(dir)).toEqual(["target"]);
      expect(
        fs.readFileSync(
          kind === "directory" ? path.join(target, "data") : target,
          "utf-8",
        ),
      ).toBe("exact bytes");
    },
  );
});

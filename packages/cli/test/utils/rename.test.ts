import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renameSyncWithRetry } from "../../src/utils/rename.js";

// Fault-injected retry/cap/fail-fast coverage runs through the real callers in
// atomic-write.test.ts and ablation-store.test.ts, including their cleanup.
describe("renameSyncWithRetry", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-rename-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each(["file", "directory"])(
    "publishes a %s without waiting when the first rename succeeds",
    (kind) => {
      vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      const source = path.join(dir, "source");
      const target = path.join(dir, "target");
      if (kind === "directory") fs.mkdirSync(source);
      fs.writeFileSync(
        kind === "directory" ? path.join(source, "data") : source,
        "exact bytes",
      );
      const wait = vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");
      const rename = vi.spyOn(fs, "renameSync");

      renameSyncWithRetry(source, target);

      expect(rename).toHaveBeenCalledExactlyOnceWith(source, target);
      expect(wait).not.toHaveBeenCalled();
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

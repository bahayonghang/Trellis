import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeFileAtomic } from "../../src/utils/atomic-write.js";

describe("writeFileAtomic Windows rename recovery (R13)", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-atomic-retry-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each(["EPERM", "EACCES", "EBUSY"])(
    "retries %s on Windows without rewriting or leaking the temp file",
    (code) => {
      vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      const target = path.join(dir, "state.json");
      fs.writeFileSync(target, "old");
      const realRename = fs.renameSync.bind(fs);
      const failure = Object.assign(new Error("locked target"), { code });
      const rename = vi
        .spyOn(fs, "renameSync")
        .mockImplementationOnce(() => {
          throw failure;
        })
        .mockImplementationOnce(() => {
          throw failure;
        })
        .mockImplementation(realRename);
      const wait = vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");
      const write = vi.spyOn(fs, "writeFileSync");

      writeFileAtomic(target, "new");

      expect(rename).toHaveBeenCalledTimes(3);
      expect(wait.mock.calls.map((call) => call[3])).toEqual([10, 20]);
      expect(write).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync(target, "utf-8")).toBe("new");
      expect(fs.readdirSync(dir)).toEqual(["state.json"]);
    },
  );

  it("allows success on the final retry after the full 550 ms backoff schedule", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const target = path.join(dir, "state.json");
    const realRename = fs.renameSync.bind(fs);
    let attempts = 0;
    const rename = vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (attempts++ < 10)
        throw Object.assign(new Error("busy"), { code: "EBUSY" });
      return realRename(from, to);
    });
    const wait = vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");

    writeFileAtomic(target, "new");

    expect(rename).toHaveBeenCalledTimes(11);
    expect(wait.mock.calls.map((call) => call[3])).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    expect(fs.readFileSync(target, "utf-8")).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["state.json"]);
  });

  it.each([
    { platform: "win32", code: "EPERM", attempts: 11 },
    { platform: "linux", code: "EPERM", attempts: 1 },
    { platform: "darwin", code: "EACCES", attempts: 1 },
    { platform: "linux", code: "EBUSY", attempts: 1 },
    { platform: "win32", code: "EIO", attempts: 1 },
    { platform: "win32", code: "ENOENT", attempts: 1 },
    { platform: "win32", code: "EEXIST", attempts: 1 },
    { platform: "win32", code: undefined, attempts: 1 },
  ] as const)(
    "preserves data and original error: $platform/$code ($attempts attempts)",
    ({ platform, code, attempts }) => {
      vi.spyOn(process, "platform", "get").mockReturnValue(platform);
      const target = path.join(dir, "state.json");
      fs.writeFileSync(target, "original");
      const failure = Object.assign(new Error("rename failed"), { code });
      const rename = vi.spyOn(fs, "renameSync").mockImplementation(() => {
        throw failure;
      });
      const wait = vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");

      let caught: unknown;
      try {
        writeFileAtomic(target, "new");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(failure);
      expect(rename).toHaveBeenCalledTimes(attempts);
      expect(wait).toHaveBeenCalledTimes(attempts - 1);
      expect(fs.readFileSync(target, "utf-8")).toBe("original");
      expect(fs.readdirSync(dir)).toEqual(["state.json"]);
    },
  );

  it("does not mask the rename error if best-effort cleanup also fails", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const target = path.join(dir, "state.json");
    fs.writeFileSync(target, "original");
    const failure = Object.assign(new Error("rename failed"), {
      code: "EACCES",
    });
    vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw failure;
    });
    vi.spyOn(Atomics, "wait").mockReturnValue("timed-out");
    vi.spyOn(fs, "rmSync").mockImplementation(() => {
      throw new Error("cleanup failed");
    });

    let caught: unknown;
    try {
      writeFileAtomic(target, "new");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
    expect(fs.readFileSync(target, "utf-8")).toBe("original");
  });
});

describe("writeFileAtomic", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-atomic-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes new content", () => {
    const f = path.join(dir, "a.json");
    writeFileAtomic(f, '{"x":1}');
    expect(fs.readFileSync(f, "utf-8")).toBe('{"x":1}');
  });

  it("overwrites and leaves no temp file behind", () => {
    const f = path.join(dir, "a.json");
    writeFileAtomic(f, "old");
    writeFileAtomic(f, "new");
    expect(fs.readFileSync(f, "utf-8")).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });

  it("preserves the original file when the write fails", () => {
    const f = path.join(dir, "keep.json");
    writeFileAtomic(f, "original");
    // Inject the failure instead of making the dir read-only: chmod on a
    // directory does not block file creation on Windows.
    const rename = vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("simulated rename failure");
    });
    try {
      expect(() => writeFileAtomic(f, "second")).toThrow(
        "simulated rename failure",
      );
    } finally {
      rename.mockRestore();
    }
    // Original survives; the temp file written before the rename is removed.
    expect(fs.readFileSync(f, "utf-8")).toBe("original");
    expect(fs.readdirSync(dir)).toEqual(["keep.json"]);
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChannel } from "../../src/commands/channel/create.js";
import { channelDir, eventsPath } from "../../src/commands/channel/store/paths.js";
import { watchEvents } from "../../src/commands/channel/store/watch.js";

describe("watchEvents", () => {
  let tmpDir: string;
  let projectDir: string;
  let oldRoot: string | undefined;
  let oldProject: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-watch-test-"));
    projectDir = path.join(tmpDir, "project");
    fs.mkdirSync(projectDir);
    oldRoot = process.env.TRELLIS_CHANNEL_ROOT;
    oldProject = process.env.TRELLIS_CHANNEL_PROJECT;
    process.env.TRELLIS_CHANNEL_ROOT = path.join(tmpDir, "channels");
    delete process.env.TRELLIS_CHANNEL_PROJECT;
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (oldRoot === undefined) delete process.env.TRELLIS_CHANNEL_ROOT;
    else process.env.TRELLIS_CHANNEL_ROOT = oldRoot;
    if (oldProject === undefined) delete process.env.TRELLIS_CHANNEL_PROJECT;
    else process.env.TRELLIS_CHANNEL_PROJECT = oldProject;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("canonicalizes only Windows native watcher targets and closes on return", async () => {
    const channel = "canonical-target";
    await createChannel(channel, { by: "main" });
    const directory = channelDir(channel);
    const canonicalDirectory = `${directory}-canonical`;
    const realpath = vi
      .spyOn(fs.realpathSync, "native")
      .mockReturnValue(canonicalDirectory);
    const watcher = { on: vi.fn(), close: vi.fn() };
    const watch = vi
      .spyOn(fs, "watch")
      .mockReturnValue(watcher as unknown as fs.FSWatcher);
    const events = watchEvents(channel, {}, { fromStart: true });

    try {
      expect((await events.next()).value).toMatchObject({ kind: "create" });
      expect(watch).toHaveBeenCalledWith(
        process.platform === "win32" ? canonicalDirectory : directory,
        expect.any(Function),
      );
      if (process.platform === "win32") {
        expect(realpath).toHaveBeenCalledWith(directory);
      } else {
        expect(realpath).not.toHaveBeenCalled();
      }
    } finally {
      await events.return(undefined);
    }
    expect(watcher.close).toHaveBeenCalledOnce();
  });

  it("keeps filtered delivery and abort working when native watcher setup fails", async () => {
    const channel = "watch-fallback";
    await createChannel(channel, { by: "main" });
    vi.spyOn(fs.realpathSync, "native").mockImplementation(() => {
      throw new Error("path resolution unavailable");
    });
    const watch = vi.spyOn(fs, "watch").mockImplementation(() => {
      throw new Error("native watch unavailable");
    });
    const abortController = new AbortController();
    const events = watchEvents(
      channel,
      { kind: ["create", "message"] },
      { fromStart: true, signal: abortController.signal },
    );

    try {
      expect((await events.next()).value).toMatchObject({ kind: "create" });
      const next = events.next();
      fs.appendFileSync(
        eventsPath(channel),
        `${JSON.stringify({ seq: 2, kind: "join", by: "worker" })}\n` +
          `${JSON.stringify({ seq: 3, kind: "message", by: "worker", text: "你好" })}\n`,
      );
      await expect(next).resolves.toMatchObject({
        done: false,
        value: { kind: "message", text: "你好" },
      });
      if (process.platform === "win32") expect(watch).not.toHaveBeenCalled();
      else expect(watch).toHaveBeenCalledOnce();
      abortController.abort();
      await expect(events.next()).resolves.toMatchObject({ done: true });
    } finally {
      abortController.abort();
      await events.return(undefined);
    }
  });

  it("preserves UTF-8 characters split across incremental reads", async () => {
    const channel = "utf8-boundary";
    await createChannel(channel, { by: "main" });

    const messageLine = Buffer.from(
      `${JSON.stringify({
        seq: 2,
        ts: "2026-08-18T00:00:00.000Z",
        kind: "message",
        by: "worker",
        text: "中",
      })}\n`,
      "utf8",
    );
    const characterStart = messageLine.indexOf(Buffer.from("中", "utf8"));
    expect(characterStart).toBeGreaterThanOrEqual(0);

    const file = eventsPath(channel);
    fs.appendFileSync(file, messageLine.subarray(0, characterStart + 1));

    const abortController = new AbortController();
    const events = watchEvents(
      channel,
      {},
      { fromStart: true, signal: abortController.signal },
    );

    try {
      const first = await events.next();
      expect(first.value).toMatchObject({ kind: "create" });

      const secondEvent = events.next();
      fs.appendFileSync(file, messageLine.subarray(characterStart + 1));

      await expect(secondEvent).resolves.toMatchObject({
        done: false,
        value: { kind: "message", text: "中" },
      });
    } finally {
      abortController.abort();
      await events.return(undefined);
    }
  });
});

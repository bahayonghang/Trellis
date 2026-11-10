import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const setupSource = readFileSync(
  new URL("./setup.ts", import.meta.url),
  "utf-8",
);

describe("test setup host-session isolation", () => {
  it.each(["PI_SESSION_ID", "PI_SESSIONID", "PI_SUBAGENT_PARENT_SESSION"])(
    "scrubs inherited %s without clearing unrelated environment",
    (key) => {
      // Evaluate the real setup in isolation: the suite's own setup has already
      // run, so asserting only against process.env would miss an absent scrub.
      const env: NodeJS.ProcessEnv = {
        [key]: "host-session-sentinel",
        PATH: "path-sentinel",
      };
      expect(env[key]).toBe("host-session-sentinel");

      vm.runInNewContext(setupSource, { process: { env } });

      expect(env[key]).toBeUndefined();
      expect(env.PATH).toBe("path-sentinel");
    },
  );
});

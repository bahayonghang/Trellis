import { describe, expect, it } from "vitest";
import { collectPlatformTemplates } from "../../src/configurators/index.js";
import { planCodexHooksUpgrade } from "../../src/configurators/codex.js";
import { scrubHooksJson } from "../../src/utils/uninstall-scrubbers.js";

const desired =
  collectPlatformTemplates("codex")?.get(".codex/hooks.json") ?? "";
const generated = JSON.parse(desired) as {
  hooks: Record<string, { hooks: { command: string }[] }[]>;
};
const legacyCommand = "python3 -X utf8 .codex/hooks/inject-workflow-state.py";
const legacy =
  JSON.stringify(
    {
      userSetting: { keep: true },
      hooks: {
        UserPromptSubmit: [
          {
            matcher: "keep matcher",
            hooks: [
              { type: "command", command: "echo user", timeout: 7 },
              {
                type: "command",
                command: legacyCommand,
                timeout: 23,
                custom: "retain",
              },
            ],
          },
        ],
        SubagentStart: [
          {
            hooks: [
              {
                type: "command",
                command:
                  "python -X utf8 .codex/hooks/inject-subagent-context.py",
              },
            ],
          },
        ],
        UnknownEvent: [{ arbitrary: "user-owned" }],
      },
    },
    null,
    4,
  ) + "\r\n";

describe("Codex command-only hook upgrade", () => {
  it("changes only proven command tokens and preserves all other source bytes", () => {
    const precise = legacy.replace(
      '"keep": true',
      '"keep": true, "precise": 900719925474099312345',
    );
    const plan = planCodexHooksUpgrade(precise, desired);
    expect(plan.kind).toBe("migrate");
    const expected = precise
      .replace(
        JSON.stringify(legacyCommand),
        JSON.stringify(generated.hooks.UserPromptSubmit[0].hooks[0].command),
      )
      .replace(
        JSON.stringify(
          "python -X utf8 .codex/hooks/inject-subagent-context.py",
        ),
        JSON.stringify(generated.hooks.SubagentStart[0].hooks[0].command),
      );
    expect(plan.content).toBe(expected);
    expect(planCodexHooksUpgrade(plan.content, desired)).toEqual({
      kind: "unchanged",
      content: expected,
    });
  });

  it.each(["python", "python3", "py -3"])(
    "recognizes the exact old %s default",
    (python) => {
      const content = JSON.stringify({
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: "command",
                  command: `${python} -X utf8 .codex/hooks/inject-workflow-state.py`,
                },
              ],
            },
          ],
        },
      });
      expect(planCodexHooksUpgrade(content, desired).kind).toBe("migrate");
    },
  );

  it.each([
    "{}\n",
    '{"hooks":{}}\n',
    '{"hooks":{"UserPromptSubmit":[]}}\n',
    JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: "command",
                command: "custom-wrapper .codex/hooks/inject-workflow-state.py",
              },
            ],
          },
        ],
      },
    }),
  ])("preserves deliberate deletion and custom commands: %s", (content) => {
    expect(planCodexHooksUpgrade(content, desired)).toEqual({
      kind: "unchanged",
      content,
    });
  });

  it.each([
    "{bad JSON",
    "[]",
    '{"hooks":null}',
    '{"hooks":{"UserPromptSubmit":{}}}',
    legacy.replace(
      '"command": "' + legacyCommand + '"',
      '"command_windows": "custom windows", "command": "' + legacyCommand + '"',
    ),
    legacy.replace(
      '"command": "' + legacyCommand + '"',
      '"commandWindows": "custom windows", "command": "' + legacyCommand + '"',
    ),
    legacy.replace(
      '"userSetting": {',
      '"extra": {"command": ' +
        JSON.stringify(legacyCommand) +
        '}, "userSetting": {',
    ),
    legacy.replace(
      '"command": "' + legacyCommand + '"',
      '"comm\\u0061nd": "' + legacyCommand + '"',
    ),
  ])("retains uncertain configuration for manual review: %s", (content) => {
    const plan = planCodexHooksUpgrade(content, desired);
    expect(plan.kind).toBe("manual");
    expect(plan.content).toBe(content);
  });

  it("retains readable script ownership for the existing uninstall scrubber", () => {
    const plan = planCodexHooksUpgrade(legacy, desired);
    expect(plan.kind).toBe("migrate");
    const result = scrubHooksJson(
      plan.content,
      [
        ".codex/hooks/inject-workflow-state.py",
        ".codex/hooks/inject-subagent-context.py",
      ],
      "nested",
    );
    expect(JSON.parse(result.content)).toEqual({
      userSetting: { keep: true },
      hooks: {
        UserPromptSubmit: [
          {
            matcher: "keep matcher",
            hooks: [{ type: "command", command: "echo user", timeout: 7 }],
          },
        ],
        UnknownEvent: [{ arbitrary: "user-owned" }],
      },
    });
  });
});

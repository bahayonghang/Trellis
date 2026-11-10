import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

let root = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(root, "packages/cli/src/templates"))) {
  const parent = path.dirname(root);
  if (parent === root) throw new Error("Trellis source checkout not found");
  root = parent;
}
const require = createRequire(path.join(root, "packages/cli/package.json"));
const ts = require("typescript");
const configPath = path.join(root, "packages/cli/tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
const files = [path.join(root, "packages/cli/test/scripts/hook-root.integration.test.ts")];
const program = ts.createProgram(files, { ...parsed.options, noEmit: true, rootDir: root });
const diagnostics = ts.getPreEmitDiagnostics(program);
const report = diagnostics.map((item) => ({ code: item.code, file: item.file?.fileName, message: ts.flattenDiagnosticMessageText(item.messageText, "\n") }));
fs.writeFileSync(new URL("strict-test-types.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(`Strict test TypeScript: ${report.length} diagnostics`);
if (report.length) process.exitCode = 1;

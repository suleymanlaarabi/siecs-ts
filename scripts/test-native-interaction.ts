import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const temporary = mkdtempSync(join(tmpdir(), "siecs-ts-picking-"));
try {
  const output = join(temporary, "picking-test");
  const result = Bun.spawnSync([
    process.env.CC ?? "clang", "-std=c17", "-O3",
    join(root, "native/interaction/picking.c"),
    join(root, "native/interaction/test/picking_test.c"),
    "-lm", "-o", output,
  ], { stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) throw new Error("Unable to compile native picking tests");
  const run = Bun.spawnSync([output], { stdout: "inherit", stderr: "inherit" });
  if (run.exitCode !== 0) throw new Error("Native picking tests failed");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

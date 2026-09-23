import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const temporary = mkdtempSync(join(tmpdir(), "siecs-ts-picking-bench-"));
try {
  const output = join(temporary, "picking-bench");
  const result = Bun.spawnSync([
    process.env.CC ?? "clang", "-std=c17", "-O3", "-D_POSIX_C_SOURCE=200809L",
    join(root, "native/interaction/picking.c"),
    join(root, "native/interaction/test/picking_bench.c"),
    "-lm", "-o", output,
  ], { stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) throw new Error("Unable to compile native interaction benchmark");
  const run = Bun.spawnSync([output], { stdout: "inherit", stderr: "inherit" });
  if (run.exitCode !== 0) throw new Error("Native interaction benchmark failed");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const output = join(root, "dist");
const tsc = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);

rmSync(output, { recursive: true, force: true });

const build = await Bun.build({
  entrypoints: [join(root, "index.ts")],
  outdir: output,
  target: "bun",
  format: "esm",
  minify: true,
});

if (!build.success) {
  throw new AggregateError(build.logs, "Package build failed");
}

const declarations = Bun.spawnSync([tsc, "-p", join(root, "tsconfig.build.json")], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});

if (declarations.exitCode !== 0) {
  throw new Error(`tsc failed with exit code ${declarations.exitCode}`);
}

rmSync(join(output, "src/runtime.d.ts"));

mkdirSync(join(output, "native/rendering"), { recursive: true });
copyFileSync(join(root, "native/libsiecs_ts.so"), join(output, "native/libsiecs_ts.so"));
cpSync(join(root, "native/rendering/shaders"), join(output, "native/rendering/shaders"), { recursive: true });

console.log(`Built ${join(output, "index.js")}`);

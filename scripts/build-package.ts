import { rmSync } from "node:fs";
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
  target: "browser",
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

for (const internal of ["runtime", "set"]) {
  rmSync(join(output, "src", `${internal}.d.ts`));
}

console.log(`Built ${join(output, "index.js")}`);

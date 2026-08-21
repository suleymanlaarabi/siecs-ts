import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const sources = [
  join(root, "siecs", "siecs.c"),
  join(root, "native", "siecs_ts.c"),
];
const outputDirectory = join(root, "wasm");
const compiler = process.env.EMCC ?? "emcc";
const temporaryDirectory = mkdtempSync(join(tmpdir(), "siecs-ts-wasm-"));
const temporaryModule = join(temporaryDirectory, "siecs.mjs");

try {
  const build = Bun.spawnSync(
    [
      compiler,
      ...sources,
      "--no-entry",
      "-std=c17",
      "-O3",
      "-DNDEBUG",
      "-Wl,--export-all,--no-gc-sections",
      "-sMODULARIZE=1",
      "-sEXPORT_ES6=1",
      "-sEXPORT_NAME=createSiecsModule",
      "-sEXPORT_ALL=1",
      "-sWASM_BIGINT=1",
      "-sALLOW_MEMORY_GROWTH=1",
      "-sALLOW_TABLE_GROWTH=1",
      "-sEXPORTED_RUNTIME_METHODS=addFunction",
      "-sENVIRONMENT=web,node",
      "-sASSERTIONS=0",
      "-sSINGLE_FILE=1",
      "-o",
      temporaryModule,
    ],
    {
      cwd: root,
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  if (build.exitCode !== 0) {
    throw new Error(`${compiler} failed with exit code ${build.exitCode}`);
  }

  mkdirSync(outputDirectory, { recursive: true });
  copyFileSync(temporaryModule, join(outputDirectory, "siecs.mjs"));
  rmSync(join(outputDirectory, "siecs.wasm"), { force: true });
  console.log(`Built ${outputDirectory}/siecs.mjs`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

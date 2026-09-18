import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const outputDirectory = join(root, "wasm");
const compiler = process.env.EMCC ?? "emcc";
const temporaryDirectory = mkdtempSync(join(tmpdir(), "siecs-ts-wasm-"));
const temporaryModule = join(temporaryDirectory, "siecs.mjs");
const temporarySiecs = join(temporaryDirectory, "siecs.c");

function writePatchedSiecs(): void {
  const source = readFileSync(join(root, "siecs", "siecs.c"), "utf8");
  // Relation cleanup runs while the command buffer still reports itself as
  // deferred. Queueing into that buffer during its flush can invalidate the
  // command currently being applied, so cascading cleanup must happen now.
  const deferredRelationCleanup = `        if (relation_record->info.desc.on_delete_target == EcsDeleteSources) {
            ecs_kill(entities[i]);
        } else {
            ecs_unrelate_id(entities[i], relation);
        }`;
  const immediateRelationCleanup = `        if (relation_record->info.desc.on_delete_target == EcsDeleteSources) {
            ecs_kill_now(entities[i]);
        } else {
            ecs_unrelate_id_now(entities[i], relation);
        }`;
  const patched = source.replace(
    deferredRelationCleanup,
    immediateRelationCleanup,
  );

  if (patched === source) {
    throw new Error(
      "Unable to apply the deferred relation cleanup patch to SIECS",
    );
  }
  writeFileSync(temporarySiecs, patched);
}

try {
  writePatchedSiecs();
  const build = Bun.spawnSync(
    [
      compiler,
      "-I",
      join(root, "siecs"),
      temporarySiecs,
      join(root, "native", "siecs_ts.c"),
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
      "-sEXPORTED_RUNTIME_METHODS=addFunction,stackSave,stackAlloc,stackRestore",
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

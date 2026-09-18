import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const compiler = process.env.CC ?? "clang";
const temporary = mkdtempSync(join(tmpdir(), "siecs-ts-native-"));
try {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("The native build currently targets Linux x64");
  }
  const original = `        if (relation_record->info.desc.on_delete_target == EcsDeleteSources) {
            ecs_kill(entities[i]);
        } else {
            ecs_unrelate_id(entities[i], relation);
        }`;
  const immediate = `        if (relation_record->info.desc.on_delete_target == EcsDeleteSources) {
            ecs_kill_now(entities[i]);
        } else {
            ecs_unrelate_id_now(entities[i], relation);
        }`;
  const source = readFileSync(join(root, "siecs/siecs.c"), "utf8");
  const patched = source.replace(original, immediate);
  if (patched === source) throw new Error("Unable to apply the deferred relation cleanup patch to SIECS");
  const core = join(temporary, "siecs.c");
  writeFileSync(core, patched);
  const pkg = Bun.spawnSync(["pkg-config", "--cflags", "--libs", "sdl3"], { stdout: "pipe", stderr: "inherit" });
  if (pkg.exitCode !== 0) throw new Error("SDL3 development files and pkg-config are required");
  const renderer = join(root, "native/rendering");
  const output = join(temporary, "libsiecs_ts.so");
  const args = [
    compiler, "-std=c17", "-O3", "-DNDEBUG", "-D_POSIX_C_SOURCE=200809L", "-fPIC", "-shared",
    "-I", join(root, "siecs"), "-I", join(root, "native/spatial/include"),
    core, join(root, "native/siecs_ts.c"),
    join(root, "native/spatial/src/spatial.c"),
    ...readdirSync(renderer).filter(name => name.endsWith(".c")).map(name => join(renderer, name)),
    ...pkg.stdout.toString().trim().split(/\s+/), "-pthread", "-lm", "-o", output,
  ];
  const result = Bun.spawnSync(args, { cwd: root, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) throw new Error(`${compiler} failed with exit code ${result.exitCode}`);
  mkdirSync(join(root, "native"), { recursive: true });
  copyFileSync(output, join(root, "native/libsiecs_ts.so"));
  console.log("Built native/libsiecs_ts.so (Linux x64)");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

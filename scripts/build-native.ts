import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const compiler = process.env.CC ?? "clang";
const temporary = mkdtempSync(join(tmpdir(), "siecs-ts-native-"));
try {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("The native build currently targets Linux x64");
  }
  const siecs = join(root, "siecs");
  const distribution = join(siecs, "distr");
  const spatial = join(siecs, "addons", "spatial");
  const gpu = join(siecs, "addons", "gpu");
  const gpu_source = join(gpu, "src");
  if (!existsSync(join(distribution, "siecs.c")) || !existsSync(join(distribution, "siecs.h"))) {
    throw new Error("SIECS submodule is not initialized; run git submodule update --init --recursive");
  }
  const pkg = Bun.spawnSync(["pkg-config", "--cflags", "--libs", "sdl3"], { stdout: "pipe", stderr: "inherit" });
  if (pkg.exitCode !== 0) throw new Error("SDL3 development files and pkg-config are required");
  const output = join(temporary, "libsiecs_ts.so");
  const args = [
    compiler, "-std=c17", "-O3", "-DNDEBUG", "-D_POSIX_C_SOURCE=200809L", "-fPIC", "-shared",
    "-I", distribution, "-I", join(spatial, "include"),
    "-I", join(gpu, "include"), "-I", gpu_source,
    "-I", join(gpu_source, "input"), "-I", join(gpu_source, "interaction"),
    join(distribution, "siecs.c"), join(root, "native/siecs_ts.c"),
    join(root, "native/siecs_ts_gpu_adapter.c"),
    join(spatial, "src", "spatial.c"),
    join(gpu_source, "rendering.c"),
    join(gpu_source, "sigpu.c"),
    join(gpu_source, "sigpu_math.c"),
    join(gpu_source, "sigpu_passes.c"),
    join(gpu_source, "sigpu_pipelines.c"),
    join(gpu_source, "sigpu_resources.c"),
    join(gpu_source, "sigpu_visibility.c"),
    join(gpu_source, "input", "input.c"),
    join(gpu_source, "interaction", "interaction.c"),
    join(gpu_source, "interaction", "picking.c"),
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

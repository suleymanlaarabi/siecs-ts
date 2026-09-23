import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
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
  if (!existsSync(join(distribution, "siecs.c")) || !existsSync(join(distribution, "siecs.h"))) {
    throw new Error("SIECS submodule is not initialized; run git submodule update --init --recursive");
  }
  const pkg = Bun.spawnSync(["pkg-config", "--cflags", "--libs", "sdl3"], { stdout: "pipe", stderr: "inherit" });
  if (pkg.exitCode !== 0) throw new Error("SDL3 development files and pkg-config are required");
  const renderer = join(root, "native/rendering");
  const input = join(root, "native/input");
  const interaction = join(root, "native/interaction");
  const output = join(temporary, "libsiecs_ts.so");
  const args = [
    compiler, "-std=c17", "-O3", "-DNDEBUG", "-D_POSIX_C_SOURCE=200809L", "-fPIC", "-shared",
    "-I", distribution, "-I", join(spatial, "include"),
    join(distribution, "siecs.c"), join(root, "native/siecs_ts.c"),
    join(spatial, "src", "spatial.c"),
    ...readdirSync(renderer).filter(name => name.endsWith(".c")).map(name => join(renderer, name)),
    ...readdirSync(input).filter(name => name.endsWith(".c")).map(name => join(input, name)),
    ...readdirSync(interaction).filter(name => name.endsWith(".c")).map(name => join(interaction, name)),
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

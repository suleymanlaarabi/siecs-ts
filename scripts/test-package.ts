import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const temporary = mkdtempSync(join(tmpdir(), "siecs-ts-package-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tsc = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);

function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, {
    cwd,
    env: {
      ...process.env,
      npm_config_dry_run: "false",
      NPM_CONFIG_DRY_RUN: "false",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    process.stderr.write(result.stdout.toString());
    process.stderr.write(result.stderr.toString());
    throw new Error(`${command.join(" ")} failed with exit code ${result.exitCode}`);
  }

  return result.stdout.toString();
}

try {
  const packed = JSON.parse(
    run(
      [
        npm,
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        temporary,
      ],
      root,
    ),
  ) as Record<string, { filename: string; files: { path: string }[] }>;
  const archive = Object.values(packed)[0]!;
  const files = archive.files.map(({ path }) => path);
  for (const path of files) {
    if (!path.startsWith("dist/") && !["README.md", "LICENSE", "package.json"].includes(path)) {
      throw new Error(`Unexpected package file: ${path}`);
    }
  }
  if (!files.includes("dist/native/libsiecs_ts.so") || !files.some(path => path.startsWith("dist/native/rendering/shaders/") && path.endsWith(".spv"))) {
    throw new Error("Package is missing its native library or compiled shaders");
  }
  const tarball = join(temporary, archive.filename);

  run(
    [npm, "install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    temporary,
  );

  const smoke = `
    import { component, entity, fini, observer, OnSet, query, resource, runSystem, system, write } from "siecs-ts";
    try {
    const Position = component("PackagePosition", { x: "f32", y: "f32" });
    const Time = resource("PackageTime", { delta: "f32" }, { delta: 2 });
    const object = entity().set(Position, { x: 10, y: 20 });
    let observed = 0;
    observer(OnSet, { position: Position }, ({ position }) => observed = position.x);
    object.set(Position, { x: 11, y: 20 });
    const Move = system({ name: "PackageMove", query: { position: write(Position), time: Time }, each: (row) => row.position.x += row.time.delta });
    runSystem(Move);
    let valid = false;
    query({ position: Position }).each(({ position }) => {
      valid = position.x === 13 && position.y === 20 && observed === 10;
    });
    if (!valid) throw new Error("installed package returned invalid data");
    } finally { fini(); }
  `;

  run([process.execPath, "--eval", smoke], temporary);

  const consumer = join(temporary, "consumer.ts");
  await Bun.write(
    consumer,
    `
      import { array, component, entity, getResource, Keyboard, Key, query, write } from "siecs-ts";
      const Position = component("TypedPackagePosition", { x: "f32", y: "f32", samples: array("f32", 3) });
      entity().set(Position, { x: 10, y: 20, samples: [1, 2, 3] });
      query({ position: Position }).each(({ position }) => {
        const x: number = position.x;
        const length: 3 = position.samples.length;
        // @ts-expect-error ordinary query fields are readonly
        position.x = x;
        // @ts-expect-error nested fixed arrays are readonly
        position.samples[0] = x;
        // @ts-expect-error schema inference rejects unknown fields
        position.missing;
        void length;
      });
      query({ position: write(Position) }).each(({ position }) => {
        position.x += 1;
        position.samples[0] = 5;
        const length: 3 = position.samples.length;
        void length;
      });
      const keyboard = getResource(Keyboard);
      const down: boolean = keyboard.keys[Key.Space]!;
      const keyCount: 13 = keyboard.keys.length;
      void down; void keyCount;
    `,
  );
  run(
    [
      tsc,
      "--noEmit",
      "--strict",
      "--target",
      "ESNext",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      consumer,
    ],
    temporary,
  );
  console.log("Installed package: BUN_NATIVE_OK (runtime, assets, declarations)");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

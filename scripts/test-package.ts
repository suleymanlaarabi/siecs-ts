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
  ) as Record<string, { filename: string }>;
  const tarball = join(temporary, Object.values(packed)[0]!.filename);

  run(
    [npm, "install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    temporary,
  );

  const smoke = `
    import { component, entity, observer, OnSet, query, resource, runSystem, system, write } from "siecs-ts";
    const Position = component("PackagePosition", { x: "f32", y: "f32" });
    const Time = resource("PackageTime", { delta: "f32" }, { delta: 2 });
    const object = entity().set(Position, { x: 10, y: 20 });
    let observed = 0;
    observer(OnSet, { position: Position }, ({ position }) => observed = position.x);
    object.set(Position, { x: 11, y: 20 });
    const Move = system("PackageMove", { position: write(Position), time: Time }, (row) => row.position.x += row.time.delta);
    runSystem(Move);
    let valid = false;
    query({ position: Position }).each(({ position }) => {
      valid = position.x === 13 && position.y === 20 && observed === 11;
    });
    if (!valid) throw new Error("installed package returned invalid data");
  `;

  run(["node", "--input-type=module", "--eval", smoke], temporary);

  const consumer = join(temporary, "consumer.ts");
  await Bun.write(
    consumer,
    `
      import { component, entity, query } from "siecs-ts";
      const Position = component("TypedPackagePosition", { x: "f32", y: "f32" });
      entity().set(Position, { x: 10, y: 20 });
      query({ position: Position }).each(({ position }) => {
        const x: number = position.x;
        console.log(x);
      });
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
  console.log("Installed package: NODE_WASM_OK");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

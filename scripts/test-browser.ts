import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const output = mkdtempSync(join(tmpdir(), "siecs-ts-browser-"));
const chromium = process.env.CHROMIUM ?? "chromium";

try {
  const build = await Bun.build({
    entrypoints: [join(root, "test", "browser.ts")],
    outdir: output,
    target: "browser",
    minify: true,
    plugins: [
      {
        name: "published-package",
        setup(build) {
          build.onResolve({ filter: /^\.\.\/index\.ts$/ }, () => ({
            path: join(root, "dist", "index.js"),
          }));
        },
      },
    ],
  });

  if (!build.success) {
    throw new AggregateError(build.logs, "Browser bundle failed");
  }

  await Bun.write(
    join(output, "index.html"),
    '<!doctype html><body>SIECS_WASM_PENDING<script type="module" src="/browser.js"></script>',
  );

  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/favicon.ico") {
        return new Response(null, { status: 204 });
      }
      const file = Bun.file(join(output, pathname === "/" ? "index.html" : pathname.slice(1)));
      return new Response(file);
    },
  });

  try {
    const browser = Bun.spawn(
      [
        chromium,
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--dump-dom",
        "--virtual-time-budget=5000",
        `http://127.0.0.1:${server.port}`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [exitCode, dom, stderr] = await Promise.all([
      browser.exited,
      new Response(browser.stdout).text(),
      new Response(browser.stderr).text(),
    ]);

    if (exitCode !== 0 || !dom.includes("SIECS_WASM_OK")) {
      process.stderr.write(stderr);
      throw new Error(`Chromium smoke test failed:\n${dom}`);
    }

    console.log("Chromium: SIECS_WASM_OK");
  } finally {
    server.stop(true);
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}

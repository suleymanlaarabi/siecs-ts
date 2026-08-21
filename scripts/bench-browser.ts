import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const output = mkdtempSync(join(tmpdir(), "siecs-ts-query-bench-"));
const chromium = process.env.CHROMIUM ?? "chromium";

try {
  const build = await Bun.build({
    entrypoints: [join(root, "bench", "browser.ts")],
    outdir: output,
    target: "browser",
    minify: true,
  });

  if (!build.success) {
    throw new AggregateError(build.logs, "Browser benchmark bundle failed");
  }

  await Bun.write(
    join(output, "index.html"),
    '<!doctype html><body>QUERY_BENCH_PENDING<script type="module" src="/browser.js"></script>',
  );

  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/favicon.ico") {
        return new Response(null, { status: 204 });
      }
      const file = Bun.file(
        join(output, pathname === "/" ? "index.html" : pathname.slice(1)),
      );
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
        "--virtual-time-budget=60000",
        `http://127.0.0.1:${server.port}`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [exitCode, dom, stderr] = await Promise.all([
      browser.exited,
      new Response(browser.stdout).text(),
      new Response(browser.stderr).text(),
    ]);
    const match = dom.match(/QUERY_BENCH:(\[[^<]+\])/);

    if (exitCode !== 0 || !match) {
      process.stderr.write(stderr);
      throw new Error(`Chromium query benchmark failed:\n${dom}`);
    }

    const results = JSON.parse(match[1]!);
    console.table(results);
  } finally {
    server.stop(true);
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}

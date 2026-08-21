import { runQueryBenchmark } from "./query-workload.ts";

document.body.textContent = `QUERY_BENCH:${JSON.stringify(runQueryBenchmark())}`;

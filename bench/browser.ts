import { runQueryBenchmark } from "./query-workload.ts";
import { runSetBenchmark } from "./set-workload.ts";
import { runSystemBenchmark } from "./system-workload.ts";

document.body.textContent = `SIECS_BENCH:${JSON.stringify({
  query: runQueryBenchmark(),
  set: runSetBenchmark(),
  system: runSystemBenchmark(),
})}`;

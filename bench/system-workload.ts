import { component, entity, query, runSystem, system, write } from "../index.ts";
import { wasm } from "../src/runtime.ts";
import { measure } from "./measure.ts";

export function runSystemBenchmark(entityCount = 100_000) {
  const Value = component("BenchSystemValue", { value: "i32" });
  for (let index = 0; index < entityCount; index++) {
    entity().set(Value, { value: 0 });
  }

  const values = query({ value: write(Value) });
  const update = (row: { value: { value: number } }) => row.value.value++;
  const Update = system("BenchSystem", { value: write(Value) }, update);
  const encoded = (Value as number) | (2 << 16);
  const pointer = wasm._malloc(4);
  wasm.HEAPU32[pointer >> 2] = encoded;
  const nativeQuery = wasm._siecs_ts_query_init(pointer, 1, 0, 0);
  wasm._free(pointer);

  const queryTime = measure(() => values.each(update));
  const systemTime = measure(() => runSystem(Update));
  const nativeRepeats = 50;
  const nativeTime =
    measure(() => {
      for (let index = 0; index < nativeRepeats; index++) {
        wasm._siecs_ts_bench_i32(nativeQuery, 1);
      }
    }) / nativeRepeats;

  return {
    entities: entityCount,
    query: queryTime,
    system: systemTime,
    native: nativeTime,
    queryRatio: systemTime / queryTime,
    nativeRatio: systemTime / nativeTime,
  };
}

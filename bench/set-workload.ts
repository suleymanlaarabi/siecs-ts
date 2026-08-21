import {
  component,
  disableObserver,
  enableObserver,
  entity,
  observer,
  OnSet,
  set,
} from "../index.ts";
import { wasm } from "../src/runtime.ts";
import { directSetComponent } from "../src/set.ts";
import { measure, measurePair } from "./measure.ts";

export function runSetBenchmark(entityCount = 100_000) {
  const Value = component("BenchSetValue", { value: "i32" });
  const entities = new Array<bigint>(entityCount);
  const entitiesPointer = wasm._malloc(entityCount * 8);

  for (let index = 0; index < entityCount; index++) {
    const object = entity().set(Value, { value: 0 });
    entities[index] = object.entity;
    wasm.HEAPU64[(entitiesPointer >> 3) + index] = object.entity;
  }

  const value = { value: 0 };
  const direct = () => {
    value.value++;
    for (const object of entities) directSetComponent(object, Value, value);
  };
  const unified = () => {
    value.value++;
    for (const object of entities) set(object, Value, value);
  };
  const native = () => {
    wasm._siecs_ts_bench_set_i32(
      entitiesPointer,
      entityCount,
      Value,
      ++value.value,
    );
  };

  let observerCalls = 0;
  const changed = observer(OnSet, { value: Value }, () => observerCalls++);
  disableObserver(changed);
  const pair = measurePair(direct, unified);
  const directTime = pair.first;
  const setTime = pair.second;
  const nativeTime = measure(native);
  enableObserver(changed);
  const observedTime = measure(unified);
  disableObserver(changed);

  return {
    entities: entityCount,
    direct: directTime,
    set: setTime,
    native: nativeTime,
    observed: observedTime,
    noObserverRatio: setTime / directTime,
    nativeRatio: setTime / nativeTime,
    observerCalls,
  };
}

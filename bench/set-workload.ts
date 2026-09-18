import {
  component,
  defer,
  disableObserver,
  enableObserver,
  entity,
  observer,
  OnSet,
  set,
  ChildOf,
  hasRelation,
  isAlive,
  kill,
  relate,
  target,
  unrelate,
} from "../index.ts";
import { native as binding } from "../src/runtime.ts";
import { directSetComponent } from "../src/set.ts";
import { measure, measurePair } from "./measure.ts";

export function runSetBenchmark(entityCount = 100_000) {
  const Value = component("BenchSetValue", { value: "i32" });
  const entities = new Array<bigint>(entityCount);
  const nativeEntities = new BigUint64Array(entityCount);

  for (let index = 0; index < entityCount; index++) {
    const object = entity().set(Value, { value: 0 });
    entities[index] = object.entity;
    nativeEntities[index] = object.entity;
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
    binding.siecs_ts_bench_set_i32(
      nativeEntities,
      entityCount,
      Value,
      ++value.value,
    );
  };
  const deferred = () => {
    value.value++;
    defer(() => {
      for (const object of entities) set(object, Value, value);
    });
  };
  const absent = () => {
    const object = entity().entity;
    set(object, Value, value);
    kill(object);
  };
  const outer = entity().entity;
  const inner = entity().entity;
  let reentering = false;
  observer(OnSet, { value: Value }, (row) => {
    if (!reentering && row.entity.entity === outer) {
      reentering = true;
      set(inner, Value, value);
      reentering = false;
    }
  });
  const reentrant = () => set(outer, Value, value);

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

  const parent = entity().entity;
  const relationEntity = entity().entity;
  const relateTime = measure(() => relate(relationEntity, ChildOf, parent));
  const retargetTime = measure(() => relate(relationEntity, ChildOf, parent));
  const targetTime = measure(() => target(relationEntity, ChildOf));
  const hasRelationTime = measure(() => hasRelation(relationEntity, ChildOf));
  const unrelateTime = measure(() => unrelate(relationEntity, ChildOf));
  const livenessEntity = entity().entity;
  const isAliveTime = measure(() => isAlive(livenessEntity));
  const killTime = measure(() => {
    const object = entity().entity;
    kill(object);
  });

  return {
    entities: entityCount,
    direct: directTime,
    set: setTime,
    native: nativeTime,
    observed: observedTime,
    deferred: measure(deferred),
    absent: measure(absent),
    reentrant: measure(reentrant),
    noObserverRatio: setTime / directTime,
    nativeRatio: setTime / nativeTime,
    observerCalls,
    relate: relateTime,
    retarget: retargetTime,
    unrelate: unrelateTime,
    target: targetTime,
    hasRelation: hasRelationTime,
    isAlive: isAliveTime,
    kill: killTime,
  };
}

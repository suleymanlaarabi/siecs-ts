import { Name } from "./builtins.js";
import { registerSetOnlyComponentSetter } from "./set.js";
import { wasm } from "./runtime.js";

const encoder = new TextEncoder();

export function setName(entity: bigint, value: string): void {
  const bytes = encoder.encode(value);
  const stack = wasm.stackSave();
  try {
    const pointer = wasm.stackAlloc(bytes.length + 1);
    wasm.HEAPU8.set(bytes, pointer);
    wasm.HEAPU8[pointer + bytes.length] = 0;
    wasm._siecs_ts_set_name(entity, pointer);
  } finally {
    wasm.stackRestore(stack);
  }
}

export function getName(entity: bigint): string {
  return wasm.UTF8ToString(wasm._ecs_entity_name(entity));
}

registerSetOnlyComponentSetter(Name, (entity, value) => {
  setName(entity, (value as { value: string }).value);
});

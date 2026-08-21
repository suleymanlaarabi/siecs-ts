import createSiecsModule from "../wasm/siecs.mjs";

export const wasm = await createSiecsModule();

wasm._ecs_init();

const textEncoder = new TextEncoder();

export function allocateString(value: string): number {
  const bytes = textEncoder.encode(value);
  const pointer = wasm._malloc(bytes.length + 1);
  wasm.HEAPU8.set(bytes, pointer);
  wasm.HEAPU8[pointer + bytes.length] = 0;
  return pointer;
}

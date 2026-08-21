import { type Component, componentLayout } from "../src/component.ts";
import { Entity } from "../src/entity.ts";
import { wasm } from "../src/runtime.ts";
import { type Cursor, createView, refreshViewHeaps } from "../src/view.ts";

export function genericQuery(descriptor: Record<string, number>) {
  const entries = Object.entries(descriptor);
  const termsPointer = wasm._malloc(entries.length * 4);

  for (let index = 0; index < entries.length; index++) {
    wasm.HEAPU32[(termsPointer >> 2) + index] = entries[index]![1];
  }

  const query = wasm._siecs_ts_query_init(termsPointer, entries.length);
  wasm._free(termsPointer);

  const entity = new Entity(0n);
  const row: Record<string, unknown> = { entity };
  const cursors: Cursor[] = [];
  const strides: number[] = [];

  for (const [name, encoded] of entries) {
    const access = encoded >>> 16;
    if (access < 5) {
      const layout = componentLayout((encoded & 0xffff) as Component);
      const cursor = createView(layout, access === 2);
      row[name] = cursor;
      cursors.push(cursor);
      strides.push(layout.size);
    }
  }

  const iter = wasm._malloc(32);
  const pointers = new Uint32Array(cursors.length);
  const steps = new Uint32Array(cursors.length);

  return {
    each(callback: (row: any) => void) {
      refreshViewHeaps();
      wasm._siecs_ts_query_iter(query, iter);
      const u32 = wasm.HEAPU32;
      const u64 = wasm.HEAPU64;

      while (wasm._ecs_iter_next(iter)) {
        const count = u32[iter >> 2]!;
        const entities = u32[(iter + 4) >> 2]!;
        const fields = u32[(iter + 8) >> 2]! >> 2;
        const kinds = u32[(iter + 20) >> 2]!;

        for (let field = 0; field < cursors.length; field++) {
          pointers[field] = u32[fields + field]!;
          steps[field] = ((kinds >>> (field * 2)) & 3) === 2 ? 0 : strides[field]!;
        }

        for (let index = 0; index < count; index++) {
          (entity as { entity: bigint }).entity = u64[(entities >> 3) + index]!;
          for (let field = 0; field < cursors.length; field++) {
            cursors[field]!._base = pointers[field]! + index * steps[field]!;
          }
          callback(row);
        }
      }
    },
  };
}

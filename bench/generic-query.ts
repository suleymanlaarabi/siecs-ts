import { ptr } from "bun:ffi";
import { type Component, componentLayout } from "../src/component.ts";
import { Entity } from "../src/entity.ts";
import { abi, native, read } from "../src/runtime.ts";
import { type Cursor, columnView, createView } from "../src/view.ts";

export function genericQuery(descriptor: Record<string, number>) {
  const entries = Object.entries(descriptor);
  const terms = new Uint32Array(entries.map(([, encoded]) => encoded));
  const query = native.siecs_ts_query_init(terms, entries.length, null, 0);

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

  const storage = new Uint8Array(abi.iterSize);
  const iter = ptr(storage);
  const pointers = new Float64Array(cursors.length);
  const steps = new Uint32Array(cursors.length);
  const caches = cursors.map(() => new Map<number, DataView>());

  return {
    each(callback: (row: any) => void) {
      native.siecs_ts_query_iter(query, storage);
      while (native.ecs_iter_next(storage)) {
        const count = read.u32(iter, abi.count);
        const entities = read.ptr(iter, abi.entities);
        const fields = read.ptr(iter, abi.ptrs);
        const kinds = read.u32(iter, abi.fieldKinds);

        for (let field = 0; field < cursors.length; field++) {
          pointers[field] = read.ptr(fields, field * abi.pointerSize);
          steps[field] = ((kinds >>> (field * 2)) & 3) === 2 ? 0 : strides[field]!;
          cursors[field]!._view = columnView(
            caches[field]!, pointers[field]!, steps[field] ? count * steps[field]! : strides[field]!,
          );
        }

        for (let index = 0; index < count; index++) {
          (entity as { entity: bigint }).entity = read.u64(entities, index * 8);
          for (let field = 0; field < cursors.length; field++) {
            cursors[field]!._base = index * steps[field]!;
          }
          callback(row);
        }
      }
    },
  };
}

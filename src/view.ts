import type { ReflectedTypeLayout } from "./component.js";
import { wasm } from "./runtime.js";

export interface Cursor {
  _base: number;
  [key: string]: unknown;
}

interface HeapSlot {
  array:
    | Uint8Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | BigUint64Array
    | BigInt64Array
    | Float32Array
    | Float64Array;
  shift: number;
}

const u8 = { array: wasm.HEAPU8, shift: 0 } satisfies HeapSlot;
const i8 = { array: wasm.HEAP8, shift: 0 } satisfies HeapSlot;
const u16 = { array: wasm.HEAPU16, shift: 1 } satisfies HeapSlot;
const i16 = { array: wasm.HEAP16, shift: 1 } satisfies HeapSlot;
const u32 = { array: wasm.HEAPU32, shift: 2 } satisfies HeapSlot;
const i32 = { array: wasm.HEAP32, shift: 2 } satisfies HeapSlot;
const u64 = { array: wasm.HEAPU64, shift: 3 } satisfies HeapSlot;
const i64 = { array: wasm.HEAP64, shift: 3 } satisfies HeapSlot;
const f32 = { array: wasm.HEAPF32, shift: 2 } satisfies HeapSlot;
const f64 = { array: wasm.HEAPF64, shift: 3 } satisfies HeapSlot;

export function refreshViewHeaps() {
  u8.array = wasm.HEAPU8;
  i8.array = wasm.HEAP8;
  u16.array = wasm.HEAPU16;
  i16.array = wasm.HEAP16;
  u32.array = wasm.HEAPU32;
  i32.array = wasm.HEAP32;
  u64.array = wasm.HEAPU64;
  i64.array = wasm.HEAP64;
  f32.array = wasm.HEAPF32;
  f64.array = wasm.HEAPF64;
}

function storage(kind: number): HeapSlot {
  switch (kind) {
    case 0:
    case 20:
      return u8;
    case 1:
    case 21:
      return u16;
    case 2:
    case 22:
    case 23:
      return u32;
    case 3:
    case 25:
      return u64;
    case 4:
    case 11:
    case 19:
      return i8;
    case 5:
    case 12:
      return i16;
    case 6:
    case 13:
    case 14:
      return i32;
    case 7:
    case 24:
      return i64;
    case 8:
      return f32;
    case 9:
      return f64;
    default:
      return u32;
  }
}

function defineScalar(
  cursor: Cursor,
  key: string,
  offset: number,
  kind: number,
  writable: boolean,
) {
  const slot = kind === 10 ? u8 : storage(kind);

  if (kind === 10) {
    Object.defineProperty(cursor, key, {
      enumerable: true,
      get: () => slot.array[(cursor._base + offset) >> slot.shift] !== 0,
      set: writable
        ? (value: boolean) => {
            slot.array[(cursor._base + offset) >> slot.shift] = value ? 1 : 0;
          }
        : undefined,
    });
    return;
  }

  Object.defineProperty(cursor, key, {
    enumerable: true,
    get: () => slot.array[(cursor._base + offset) >> slot.shift],
    set: writable
      ? (value: never) => {
          slot.array[(cursor._base + offset) >> slot.shift] = value;
        }
      : undefined,
  });
}

function defineValue(
  cursor: Cursor,
  key: string,
  offset: number,
  layout: ReflectedTypeLayout,
  writable: boolean,
) {
  if (layout.kind !== 16 && layout.kind !== 17) {
    defineScalar(cursor, key, offset, layout.kind, writable);
    return;
  }

  const nested = createView(layout, writable);
  Object.defineProperty(cursor, key, {
    enumerable: true,
    get: () => {
      nested._base = cursor._base + offset;
      return nested;
    },
  });
}

export function createView(
  layout: ReflectedTypeLayout,
  writable: boolean,
): Cursor {
  const cursor: Cursor = { _base: 0 };

  if (layout.kind === 16) {
    for (const field of layout.fields!) {
      defineValue(cursor, field.name, field.offset, field.type, writable);
    }
    return cursor;
  }

  Object.defineProperty(cursor, "length", {
    enumerable: false,
    value: layout.count,
  });

  const element = layout.element!;
  for (let index = 0; index < layout.count!; index++) {
    defineValue(
      cursor,
      String(index),
      index * element.size,
      element,
      writable,
    );
  }

  return cursor;
}

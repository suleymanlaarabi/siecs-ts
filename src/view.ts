import { CString, toArrayBuffer } from "bun:ffi";
import type { ReflectedTypeLayout } from "./component.js";
import { native, read } from "./runtime.js";

export interface Cursor {
  _base: number;
  _view?: DataView;
  [key: string]: unknown;
}

export type ScalarKind = "u8" | "u16" | "u32" | "u64" | "i8" | "i16" | "i32" | "i64" | "f32" | "f64" | "ptr";

/** Resolve native long/pointer widths once, while compiling the reflected layout. */
export function scalarKind(layout: ReflectedTypeLayout): ScalarKind {
  switch (layout.kind) {
    case 0: case 10: case 20: return "u8";
    case 1: case 21: return "u16";
    case 2: case 22: return "u32";
    case 3: case 25: return "u64";
    case 4: case 11: case 19: return "i8";
    case 5: case 12: return "i16";
    case 6: case 13: return "i32";
    case 7: case 24: return "i64";
    case 8: return "f32";
    case 9: return "f64";
    case 14: return layout.size === 8 ? "i64" : "i32";
    case 23: return layout.size === 8 ? "u64" : "u32";
    case 15: case 18: case 26: return "ptr";
    case 27: return layout.size === 1 ? "u8" : layout.size === 2 ? "u16" : layout.size === 8 ? "i64" : "i32";
    default: return "u32";
  }
}

const dataMethods = {
  u8: ["getUint8", "setUint8"], u16: ["getUint16", "setUint16"],
  u32: ["getUint32", "setUint32"], u64: ["getBigUint64", "setBigUint64"],
  i8: ["getInt8", "setInt8"], i16: ["getInt16", "setInt16"],
  i32: ["getInt32", "setInt32"], i64: ["getBigInt64", "setBigInt64"],
  f32: ["getFloat32", "setFloat32"], f64: ["getFloat64", "setFloat64"],
  ptr: ["getBigUint64", "setBigUint64"],
} as const;

/** Native columns are mapped on first encounter and after their address/size changes. */
export function columnView(cache: Map<number, DataView>, pointer: number, size: number): DataView {
  let view = cache.get(pointer);
  if (!view || view.byteLength < size) {
    view = new DataView(toArrayBuffer(pointer, 0, Math.max(size, 1)));
    cache.set(pointer, view);
  }
  return view;
}

export function attachView(cursor: Cursor, pointer: number, size: number): void {
  cursor._view = new DataView(toArrayBuffer(pointer, 0, Math.max(size, 1)));
  cursor._base = 0;
}

function defineValue(cursor: Cursor, key: string, offset: number, layout: ReflectedTypeLayout, writable: boolean, raw: boolean, strings: boolean): void {
  if (layout.kind === 16 || layout.kind === 17) {
    const nested = createView(layout, writable, raw, strings);
    Object.defineProperty(cursor, key, {
      enumerable: true,
      get: () => {
        nested._base = cursor._base + offset;
        nested._view = cursor._view;
        return nested;
      },
    });
    return;
  }
  if (strings && layout.kind === 18 && layout.element?.kind === 11) {
    Object.defineProperty(cursor, key, {
      enumerable: true,
      get: () => {
        const pointer = raw ? read.ptr(cursor._base, offset) : Number(cursor._view!.getBigUint64(cursor._base + offset, true));
        return pointer ? new CString(pointer) : "";
      },
    });
    return;
  }
  const kind = scalarKind(layout);
  if (!raw) {
    const [getMethod, setMethod] = dataMethods[kind];
    const value = `cursor._view.${getMethod}(cursor._base+${offset},true)`;
    const converted = kind === "ptr" ? `Number(${value})` : layout.kind === 10 ? `${value}!==0` : value;
    const write = kind === "ptr" ? "BigInt(value)" : layout.kind === 10 ? "+value" : "value";
    Object.defineProperty(cursor, key, {
      enumerable: true,
      get: new Function("cursor", `return function(){return ${converted}}`)(cursor),
      set: writable ? new Function("cursor", `return function(value){cursor._view.${setMethod}(cursor._base+${offset},${write},true)}`)(cursor) : undefined,
    });
    return;
  }
  const get = read[kind];
  const set = native[`siecs_ts_write_${kind}`] as (pointer: number, value: any) => void;
  const boolean = layout.kind === 10;
  Object.defineProperty(cursor, key, {
    enumerable: true,
    get: boolean ? () => get(cursor._base, offset) !== 0 : () => get(cursor._base, offset),
    set: writable
      ? boolean ? (value: boolean) => set(cursor._base + offset, +value)
        : (value: unknown) => set(cursor._base + offset, value)
      : undefined,
  });
}

export function createView(layout: ReflectedTypeLayout, writable: boolean, raw = false, strings = false): Cursor {
  const cursor: Cursor = { _base: 0 };
  if (layout.kind === 16) {
    for (const field of layout.fields!) defineValue(cursor, field.name, field.offset, field.type, writable, raw, strings);
  } else {
    Object.defineProperty(cursor, "length", { value: layout.count });
    const element = layout.element!;
    for (let index = 0; index < layout.count!; index++) {
      defineValue(cursor, String(index), index * element.size, element, writable, raw, strings);
    }
  }
  return cursor;
}

import { ptr } from "bun:ffi";
import type { Component, ComponentMutation, ComponentValue, ReflectedTypeLayout } from "./component.js";
import { native } from "./runtime.js";
import { scalarKind } from "./view.js";

type Setter = (entity: bigint, value: unknown) => void;
type ValueSetter = (view: DataView, value: unknown, strings?: Uint8Array[]) => void;
export const componentSetters: Setter[] = [];
const directComponentSetters: Setter[] = [];

const methods = {
  u8: "setUint8", u16: "setUint16", u32: "setUint32", u64: "setBigUint64",
  i8: "setInt8", i16: "setInt16", i32: "setInt32", i64: "setBigInt64",
  f32: "setFloat32", f64: "setFloat64", ptr: "setBigUint64",
} as const;

function compileWrites(layout: ReflectedTypeLayout, direct: boolean, stringPointers = false): string {
  const writes: string[] = [];
  let stringIndex = 0;
  function emit(type: ReflectedTypeLayout, offset: number, value: string): void {
    if (type.kind === 16) {
      for (const field of type.fields!) emit(field.type, offset + field.offset, `${value}[${JSON.stringify(field.name)}]`);
    } else if (type.kind === 17) {
      for (let index = 0; index < type.count!; index++) emit(type.element!, offset + index * type.element!.size, `${value}[${index}]`);
    } else {
      const kind = scalarKind(type);
      const scalar = type.kind === 10 ? `+${value}` : value;
      if (stringPointers && type.kind === 18 && type.element?.kind === 11) {
        writes.push(`view.setBigUint64(${offset},BigInt(stringPointer(${value},strings,${stringIndex++})),true);`);
        return;
      }
      writes.push(direct
        ? `native.siecs_ts_write_${kind}(pointer+${offset},${scalar});`
        : `view.${methods[kind]}(${offset},${kind === "ptr" ? `BigInt(${scalar})` : scalar},true);`);
    }
  }
  emit(layout, 0, "value");
  return writes.join("");
}

function stringPointer(value: string | number, strings: Uint8Array[], index: number): number {
  if (typeof value !== "string") return value;
  strings[index] = Buffer.from(value + "\0");
  return ptr(strings[index]!);
}

export function compileValueSetter(layout: ReflectedTypeLayout, stringPointers = false): ValueSetter {
  return new Function("stringPointer", `return function(view,value,strings){${compileWrites(layout, false, stringPointers)}}`)(stringPointer) as ValueSetter;
}

export function registerComponentSetter(component: Component<unknown, ComponentMutation>, layout: ReflectedTypeLayout): void {
  const direct = new Function("native", "component",
    `return function(entity,value){const pointer=native.siecs_ts_ensure_cid(entity,component);${compileWrites(layout, true)}}`
  )(native, component) as Setter;
  directComponentSetters[component] = direct;
  const serialize = compileValueSetter(layout);
  // Retained buffers keep their addresses stable. Reentrancy uses a separate depth.
  const buffers = [new Uint8Array(Math.max(layout.size, 1))];
  const views = [new DataView(buffers[0]!.buffer)];
  const pointers = [ptr(buffers[0]!)];
  let depth = 0;
  componentSetters[component] = (entity, value) => {
    const index = depth++;
    if (!buffers[index]) {
      buffers[index] = new Uint8Array(Math.max(layout.size, 1));
      views[index] = new DataView(buffers[index]!.buffer);
      pointers[index] = ptr(buffers[index]!);
    }
    try {
      serialize(views[index]!, value);
      native.ecs_set_cid(entity, component, pointers[index]!);
    } finally {
      depth--;
    }
  };
}

export function registerSetOnlyComponentSetter(component: Component<unknown, ComponentMutation>, setter: Setter): void {
  componentSetters[component] = setter;
}
export function setComponent<ComponentType extends Component<unknown, ComponentMutation>>(entity: bigint, component: ComponentType, value: ComponentValue<ComponentType>): void {
  componentSetters[component]!(entity, value);
}
export function directSetComponent<ComponentType extends Component<unknown, ComponentMutation>>(entity: bigint, component: ComponentType, value: ComponentValue<ComponentType>): void {
  directComponentSetters[component]!(entity, value);
}

import type {
  Component,
  ComponentValue,
  ReflectedTypeLayout,
} from "./component.js";
import { wasm } from "./runtime.js";

type Setter = (entity: bigint, value: unknown) => void;

export const componentSetters: Setter[] = [];

interface Storage {
  heap: string;
  shift: number;
}

function storage(kind: number): Storage {
  switch (kind) {
    case 0:
    case 10:
    case 20:
      return { heap: "HEAPU8", shift: 0 };
    case 1:
    case 21:
      return { heap: "HEAPU16", shift: 1 };
    case 2:
    case 15:
    case 18:
    case 22:
    case 23:
    case 26:
      return { heap: "HEAPU32", shift: 2 };
    case 3:
    case 25:
      return { heap: "HEAPU64", shift: 3 };
    case 4:
    case 11:
    case 19:
      return { heap: "HEAP8", shift: 0 };
    case 5:
    case 12:
      return { heap: "HEAP16", shift: 1 };
    case 6:
    case 13:
    case 14:
      return { heap: "HEAP32", shift: 2 };
    case 7:
    case 24:
      return { heap: "HEAP64", shift: 3 };
    case 8:
      return { heap: "HEAPF32", shift: 2 };
    case 9:
      return { heap: "HEAPF64", shift: 3 };
    default:
      return { heap: "HEAPU32", shift: 2 };
  }
}

function compileSetter(component: Component, layout: ReflectedTypeLayout): Setter {
  const heaps = new Map<string, string>();
  const writes: string[] = [];

  function emit(type: ReflectedTypeLayout, offset: number, value: string) {
    if (type.kind === 16) {
      for (const field of type.fields!) {
        emit(
          field.type,
          offset + field.offset,
          `${value}[${JSON.stringify(field.name)}]`,
        );
      }
      return;
    }

    if (type.kind === 17) {
      for (let index = 0; index < type.count!; index++) {
        emit(
          type.element!,
          offset + index * type.element!.size,
          `${value}[${index}]`,
        );
      }
      return;
    }

    const { heap, shift } = storage(type.kind);
    let local = heaps.get(heap);
    if (!local) {
      local = `h${heaps.size}`;
      heaps.set(heap, local);
    }
    writes.push(
      `${local}[(pointer+${offset})>>>${shift}]=${type.kind === 10 ? "+" : ""}${value};`,
    );
  }

  emit(layout, 0, "value");

  const heapLocals = Array.from(
    heaps,
    ([heap, local]) => `const ${local}=wasm.${heap};`,
  ).join("");
  const factory = new Function(
    "wasm",
    "component",
    `return function(entity,value){
      const pointer=wasm._siecs_ts_ensure_cid(entity,component);
      ${heapLocals}
      ${writes.join("")}
    }`,
  ) as (wasm: typeof import("./runtime.js").wasm, component: Component) => Setter;

  return factory(wasm, component);
}

export function registerComponentSetter(
  component: Component,
  layout: ReflectedTypeLayout,
) {
  componentSetters[component] = compileSetter(component, layout);
}

export function setComponent<ComponentType extends Component>(
  entity: bigint,
  component: ComponentType,
  value: ComponentValue<ComponentType>,
) {
  componentSetters[component]!(entity, value);
}

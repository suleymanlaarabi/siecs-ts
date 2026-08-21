import { type Component, componentLayout } from "./component.js";
import { Entity } from "./entity.js";
import { wasm } from "./runtime.js";
import { type Cursor, createView, refreshViewHeaps } from "./view.js";

type WasmModule = typeof wasm;

declare const writeBrand: unique symbol;
declare const filterBrand: unique symbol;
declare const withoutBrand: unique symbol;

export type Write<ComponentType extends Component = Component> = number & {
  readonly [writeBrand]: ComponentType;
};

export type Filter<ComponentType extends Component = Component> = number & {
  readonly [filterBrand]: ComponentType;
};

export type Without<ComponentType extends Component = Component> = number & {
  readonly [withoutBrand]: ComponentType;
};

type QueryTerm = Component | Write | Filter | Without;
type QueryDescriptor = Readonly<Record<string, QueryTerm>>;

type DataOf<Value> = Value extends Component<infer Data>
  ? Data
  : Value extends Write<infer ComponentType>
    ? ComponentType extends Component<infer Data>
      ? Data
      : never
    : never;

type DeepReadonly<Value> = Value extends
  | number
  | bigint
  | boolean
  | string
  | null
  | undefined
  ? Value
  : Value extends readonly (infer Element)[]
    ? ReadonlyArray<DeepReadonly<Element>> & { readonly length: Value["length"] }
    : { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> };

export type QueryRow<Descriptor extends QueryDescriptor> = {
  readonly entity: Entity;
} & {
  readonly [Key in keyof Descriptor as Descriptor[Key] extends Filter | Without
    ? never
    : Key]: Descriptor[Key] extends Write
    ? DataOf<Descriptor[Key]>
    : DeepReadonly<DataOf<Descriptor[Key]>>;
};

export interface Query<Row> {
  each(callback: (row: Row) => void): void;
}

export function write<const ComponentType extends Component>(
  component: ComponentType,
): Write<ComponentType> {
  return (component | (2 << 16)) as Write<ComponentType>;
}

export function filter<const ComponentType extends Component>(
  component: ComponentType,
): Filter<ComponentType> {
  return (component | (5 << 16)) as Filter<ComponentType>;
}

export function without<const ComponentType extends Component>(
  component: ComponentType,
): Without<ComponentType> {
  return (component | (6 << 16)) as Without<ComponentType>;
}

function compileEach(
  query: number,
  iter: number,
  row: Record<string, unknown>,
  entity: Entity,
  cursors: Cursor[],
  strides: number[],
): (callback: (row: never) => void) => void {
  const locals = cursors.map((_, index) => `const c${index}=cursors[${index}];`).join("");
  const batches = cursors
    .map(
      (_, index) =>
        `const p${index}=u32[(ptrs>>>2)+${index}];` +
        `const s${index}=((kinds>>>${index * 2})&3)===2?0:${strides[index]};`,
    )
    .join("");
  const rows = cursors
    .map((_, index) => `c${index}._base=p${index}+i*s${index};`)
    .join("");

  const factory = new Function(
    "wasm",
    "refresh",
    "query",
    "iter",
    "row",
    "entity",
    "cursors",
    `${locals}return function(callback){
      refresh();
      wasm._siecs_ts_query_iter(query,iter);
      const u32=wasm.HEAPU32;
      const u64=wasm.HEAPU64;
      while(wasm._ecs_iter_next(iter)){
        const count=u32[iter>>>2];
        const entities=u32[(iter+4)>>>2];
        const ptrs=u32[(iter+8)>>>2];
        const kinds=u32[(iter+20)>>>2];
        ${batches}
        for(let i=0;i<count;i++){
          entity.entity=u64[(entities>>>3)+i];
          ${rows}
          callback(row);
        }
      }
    }`,
  ) as (
    wasm: WasmModule,
    refresh: typeof refreshViewHeaps,
    query: number,
    iter: number,
    row: Record<string, unknown>,
    entity: Entity,
    cursors: Cursor[],
  ) => (callback: (row: never) => void) => void;

  return factory(wasm, refreshViewHeaps, query, iter, row, entity, cursors);
}

export function query<const Descriptor extends QueryDescriptor>(
  descriptor: Descriptor & { readonly entity?: never },
): Query<QueryRow<Descriptor>> {
  const entries = Object.entries(descriptor);
  const termsPointer = wasm._malloc(entries.length * 4);
  const terms = wasm.HEAPU32;

  for (let index = 0; index < entries.length; index++) {
    terms[(termsPointer >> 2) + index] = entries[index]![1] as number;
  }

  const id = wasm._siecs_ts_query_init(termsPointer, entries.length);
  wasm._free(termsPointer);

  const entity = new Entity(0n);
  const row: Record<string, unknown> = { entity };
  const cursors: Cursor[] = [];
  const strides: number[] = [];

  for (const [name, encoded] of entries) {
    const access = (encoded as number) >>> 16;
    if (access < 5) {
      const layout = componentLayout(((encoded as number) & 0xffff) as Component);
      const cursor = createView(layout, access === 2);
      row[name] = cursor;
      cursors.push(cursor);
      strides.push(layout.size);
    }
  }

  const iter = wasm._malloc(32);
  const each = compileEach(id, iter, row, entity, cursors, strides);
  return { each } as Query<QueryRow<Descriptor>>;
}

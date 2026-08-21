import { type Component, componentLayout } from "./component.js";
import { Entity } from "./entity.js";
import {
  type Resource,
  isResource,
  resourceId,
  resourceLayout,
  resourcePointer,
} from "./resource.js";
import { wasm } from "./runtime.js";
import { type Cursor, createView, refreshViewHeaps } from "./view.js";

declare const writeBrand: unique symbol;
declare const filterBrand: unique symbol;
declare const withoutBrand: unique symbol;

export type AccessTarget = Component | Resource;

export interface Write<Target extends AccessTarget = AccessTarget> {
  readonly target: Target;
  readonly access: 2;
  readonly [writeBrand]: Target;
}

export interface Filter<ComponentType extends Component = Component> {
  readonly target: ComponentType;
  readonly access: 5;
  readonly [filterBrand]: ComponentType;
}

export interface Without<ComponentType extends Component = Component> {
  readonly target: ComponentType;
  readonly access: 6;
  readonly [withoutBrand]: ComponentType;
}

export type AccessTerm = AccessTarget | Write | Filter | Without;
export type AccessDescriptor = Readonly<Record<string, AccessTerm>>;

type TargetOf<Term> = Term extends Write<infer Target>
  ? Target
  : Term extends Filter<infer ComponentType>
    ? ComponentType
    : Term extends Without<infer ComponentType>
      ? ComponentType
      : Term extends AccessTarget
        ? Term
        : never;

type DataOf<Term> = TargetOf<Term> extends Component<infer Data>
  ? Data
  : TargetOf<Term> extends Resource<infer Data>
    ? Data
    : never;

export type DeepReadonly<Value> = Value extends
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

type ComponentKeys<Descriptor extends AccessDescriptor> = {
  [Key in keyof Descriptor]: TargetOf<Descriptor[Key]> extends Component
    ? Key
    : never;
}[keyof Descriptor];

type EntityField<Descriptor extends AccessDescriptor> =
  ComponentKeys<Descriptor> extends never
    ? Record<never, never>
    : { readonly entity: Entity };

type DataFields<Descriptor extends AccessDescriptor> = {
  readonly [Key in keyof Descriptor as Descriptor[Key] extends Filter | Without
    ? never
    : Key]: Descriptor[Key] extends Write
    ? DataOf<Descriptor[Key]>
    : DeepReadonly<DataOf<Descriptor[Key]>>;
};

export type AccessRow<Descriptor extends AccessDescriptor> =
  EntityField<Descriptor> & DataFields<Descriptor>;

export type ObserverRow<Descriptor extends AccessDescriptor> = {
  readonly entity: Entity;
} & DataFields<Descriptor>;

interface Modifier {
  target: AccessTarget;
  access: number;
}

interface ComponentField {
  id: Component;
  cursor: Cursor;
  stride: number;
}

export interface AccessPlan {
  readonly componentTerms: number[];
  readonly resourceTerms: number[];
  readonly row: Record<string, unknown>;
  readonly entity?: Entity;
  readonly componentFields: ComponentField[];
}

export function write<const Target extends AccessTarget>(
  target: Target,
): Write<Target> {
  return { target, access: 2 } as Write<Target>;
}

export function filter<const ComponentType extends Component>(
  target: ComponentType,
): Filter<ComponentType> {
  return { target, access: 5 } as Filter<ComponentType>;
}

export function without<const ComponentType extends Component>(
  target: ComponentType,
): Without<ComponentType> {
  return { target, access: 6 } as Without<ComponentType>;
}

function decode(term: AccessTerm): Modifier {
  if (typeof term === "object" && term !== null && "access" in term) {
    return term as Modifier;
  }
  return { target: term as AccessTarget, access: 0 };
}

export function compileAccess(
  descriptor: AccessDescriptor,
  alwaysEntity = false,
): AccessPlan {
  const entries = Object.entries(descriptor);
  const componentTerms: number[] = [];
  const resourceTerms: number[] = [];
  const componentFields: ComponentField[] = [];
  const row: Record<string, unknown> = {};

  for (const [name, term] of entries) {
    const { target, access } = decode(term);
    if (isResource(target)) {
      resourceTerms.push(resourceId(target) | (access << 16));
      const cursor = createView(resourceLayout(target), access === 2);
      cursor._base = resourcePointer(target);
      row[name] = cursor;
      continue;
    }

    const component = target as Component;
    componentTerms.push((component as number) | (access << 16));
    if (access < 5) {
      const layout = componentLayout(component);
      const cursor = createView(layout, access === 2);
      row[name] = cursor;
      componentFields.push({ id: component, cursor, stride: layout.size });
    }
  }

  let entity: Entity | undefined;
  if (alwaysEntity || componentTerms.length) {
    entity = new Entity(0n);
    row.entity = entity;
  }

  return { componentTerms, resourceTerms, row, entity, componentFields };
}

export function allocateTerms(terms: readonly number[]): number {
  if (!terms.length) return 0;
  const pointer = wasm._malloc(terms.length * 4);
  wasm.HEAPU32.set(terms, pointer >> 2);
  return pointer;
}

interface RowCode {
  locals: string;
  batch: string;
  rows: string;
}

function rowCode(plan: AccessPlan): RowCode {
  return {
    locals: plan.componentFields
      .map((_, index) => `const c${index}=fields[${index}].cursor;`)
      .join(""),
    batch: plan.componentFields
      .map(
        (_, index) =>
          `const p${index}=u32[(ptrs>>>2)+${index}];` +
          `const s${index}=((kinds>>>${index * 2})&3)===2?0:fields[${index}].stride;`,
      )
      .join(""),
    rows: plan.componentFields
      .map((_, index) => `c${index}._base=p${index}+i*s${index};`)
      .join(""),
  };
}

export function compileQueryEach(
  query: number,
  iter: number,
  plan: AccessPlan,
): (callback: (row: never) => void) => void {
  if (!plan.componentTerms.length) {
    return (callback) => {
      refreshViewHeaps();
      callback(plan.row as never);
    };
  }

  const code = rowCode(plan);
  const factory = new Function(
    "wasm",
    "refresh",
    "query",
    "iter",
    "row",
    "entity",
    "fields",
    `${code.locals}return function(callback){
      refresh();
      wasm._siecs_ts_query_iter(query,iter);
      const u32=wasm.HEAPU32;
      const u64=wasm.HEAPU64;
      while(wasm._ecs_iter_next(iter)){
        const count=u32[iter>>>2];
        const entities=u32[(iter+4)>>>2];
        const ptrs=u32[(iter+8)>>>2];
        const kinds=u32[(iter+20)>>>2];
        ${code.batch}
        for(let i=0;i<count;i++){
          entity.entity=u64[(entities>>>3)+i];
          ${code.rows}
          callback(row);
        }
      }
    }`,
  ) as (
    wasmModule: typeof wasm,
    refresh: typeof refreshViewHeaps,
    queryId: number,
    iterPointer: number,
    row: Record<string, unknown>,
    entity: Entity,
    fields: ComponentField[],
  ) => (callback: (row: never) => void) => void;

  return factory(
    wasm,
    refreshViewHeaps,
    query,
    iter,
    plan.row,
    plan.entity!,
    plan.componentFields,
  );
}

export interface SystemContext {
  readonly deltaTime: number;
}

export function compileSystemBatch(
  plan: AccessPlan,
  context: { deltaTime: number },
  callback: (row: never, context: SystemContext) => void,
): (iter: number) => void {
  if (!plan.componentTerms.length) {
    return (iter) => {
      refreshViewHeaps();
      context.deltaTime = wasm.HEAPF32[(iter + 12) >> 2]!;
      callback(plan.row as never, context);
    };
  }

  const code = rowCode(plan);
  const factory = new Function(
    "wasm",
    "refresh",
    "row",
    "entity",
    "fields",
    "context",
    "callback",
    `${code.locals}return function(iter){
      refresh();
      const u32=wasm.HEAPU32;
      const u64=wasm.HEAPU64;
      context.deltaTime=wasm.HEAPF32[(iter+12)>>>2];
      const count=u32[iter>>>2];
      const entities=u32[(iter+4)>>>2];
      const ptrs=u32[(iter+8)>>>2];
      const kinds=u32[(iter+20)>>>2];
      ${code.batch}
      for(let i=0;i<count;i++){
        entity.entity=u64[(entities>>>3)+i];
        ${code.rows}
        callback(row,context);
      }
    }`,
  ) as (
    wasmModule: typeof wasm,
    refresh: typeof refreshViewHeaps,
    row: Record<string, unknown>,
    entity: Entity,
    fields: ComponentField[],
    context: { deltaTime: number },
    callback: (row: never, context: SystemContext) => void,
  ) => (iter: number) => void;

  return factory(
    wasm,
    refreshViewHeaps,
    plan.row,
    plan.entity!,
    plan.componentFields,
    context,
    callback,
  );
}

export function refreshObserverRow(plan: AccessPlan, entity: bigint): void {
  refreshViewHeaps();
  (plan.entity as unknown as { entity: bigint }).entity = entity;
  for (const field of plan.componentFields) {
    field.cursor._base = wasm._ecs_get_cid(entity, field.id);
  }
}

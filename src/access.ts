import {
  type Component,
  type ComponentMutation,
  componentLayout,
} from "./component.js";
import { Entity } from "./entity.js";
import { Name } from "./builtins.js";
import {
  type Resource,
  isResource,
  resourceId,
  resourceLayout,
  resourcePointer,
  resourceStrings,
} from "./resource.js";
import { ptr } from "bun:ffi";
import { abi, native, read } from "./runtime.js";
import { type Cursor, attachView, columnView, createView } from "./view.js";

declare const writeBrand: unique symbol;
declare const filterBrand: unique symbol;
declare const withoutBrand: unique symbol;

export type AccessTarget = Component<unknown, "direct" | "set-only"> | Resource;
type WritableAccessTarget = Component<unknown, "direct"> | Resource;

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

type DataOf<Term> = TargetOf<Term> extends Component<infer Data, ComponentMutation>
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
  cache: Map<number, DataView>;
}

export interface AccessPlan {
  readonly componentTerms: number[];
  readonly resourceTerms: number[];
  readonly row: Record<string, unknown>;
  readonly entity?: Entity;
  readonly componentFields: ComponentField[];
}

export function write<const Target extends WritableAccessTarget>(
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
      const cursor = createView(resourceLayout(target), access === 2, false, resourceStrings(target));
      attachView(cursor, resourcePointer(target), resourceLayout(target).size);
      row[name] = cursor;
      continue;
    }

    const component = target as Component;
    componentTerms.push((component as number) | (access << 16));
    if (access < 5) {
      const layout = componentLayout(component);
      const cursor = createView(layout, access === 2, alwaysEntity, component === Name);
      row[name] = cursor;
      componentFields.push({ id: component, cursor, stride: layout.size, cache: new Map() });
    }
  }

  if (componentTerms.length > abi.componentCapacity || resourceTerms.length > abi.resourceCapacity) {
    throw new RangeError(`Native queries support at most ${abi.componentCapacity} component and ${abi.resourceCapacity} resource terms`);
  }

  let entity: Entity | undefined;
  if (alwaysEntity || componentTerms.length) {
    entity = new Entity(0n);
    row.entity = entity;
  }

  return { componentTerms, resourceTerms, row, entity, componentFields };
}

export function allocateTerms(terms: readonly number[]): Uint32Array | null {
  return terms.length ? new Uint32Array(terms) : null;
}

function rowCode(plan: AccessPlan) {
  return {
    locals: plan.componentFields.map((_, index) => `const c${index}=fields[${index}].cursor;`).join(""),
    batch: plan.componentFields.map((_, index) =>
      `const p${index}=read.ptr(ptrs,${index * abi.pointerSize});` +
      `const s${index}=((kinds>>>${index * 2})&3)===2?0:fields[${index}].stride;` +
      `c${index}._view=columnView(fields[${index}].cache,p${index},s${index}?count*s${index}:fields[${index}].stride);`
    ).join(""),
    rows: plan.componentFields.map((_, index) => `c${index}._base=i*s${index};`).join(""),
  };
}

function batchCode(plan: AccessPlan, invoke: string): string {
  const code = rowCode(plan);
  return `
    const count=read.u32(iter,${abi.count});
    const entities=read.ptr(iter,${abi.entities});
    const ptrs=read.ptr(iter,${abi.ptrs});
    const kinds=read.u32(iter,${abi.fieldKinds});
    ${code.batch}
    for(let i=0;i<count;i++){
      entity.entity=read.u64(entities,i*8);
      ${code.rows}
      ${invoke}
    }`;
}

export function compileQueryEach(query: number, storage: Uint8Array, plan: AccessPlan): (callback: (row: never) => void) => void {
  if (!plan.componentTerms.length) return callback => callback(plan.row as never);
  const code = rowCode(plan);
  const factory = new Function("native", "read", "ptr", "columnView", "query", "storage", "row", "entity", "fields",
    `${code.locals}return function(callback){
      const iter=ptr(storage);
      native.siecs_ts_query_iter(query,iter);
      while(native.ecs_iter_next(iter)){
        ${batchCode(plan, "callback(row);")}
      }
    }`
  );
  return factory(native, read, ptr, columnView, query, storage, plan.row, plan.entity, plan.componentFields);
}

export interface SystemContext { readonly deltaTime: number; }

export function compileSystemBatch(plan: AccessPlan, context: { deltaTime: number }, callback: (row: never, context: SystemContext) => void): (iter: number) => void {
  if (!plan.componentTerms.length) {
    return iter => {
      context.deltaTime = read.f32(iter, abi.deltaTime);
      callback(plan.row as never, context);
    };
  }
  const code = rowCode(plan);
  const factory = new Function("read", "columnView", "row", "entity", "fields", "context", "callback",
    `${code.locals}return function(iter){
      context.deltaTime=read.f32(iter,${abi.deltaTime});
      ${batchCode(plan, "callback(row,context);")}
    }`
  );
  return factory(read, columnView, plan.row, plan.entity, plan.componentFields, context, callback);
}

export function refreshObserverRow(plan: AccessPlan, entity: bigint): void {
  plan.entity!.entity = entity;
  for (const field of plan.componentFields) field.cursor._base = native.ecs_get_cid(entity, field.id);
}

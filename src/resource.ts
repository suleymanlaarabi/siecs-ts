import {
  type ComponentData,
  type ComponentSchema,
  type ReflectedTypeLayout,
  reflectType,
  schemaSource,
} from "./component.js";
import { allocateString, wasm } from "./runtime.js";
import { compileValueSetter } from "./set.js";
import { type Cursor, createView, refreshViewHeaps } from "./view.js";

declare const resourceBrand: unique symbol;
const resourceKind = Symbol("siecs.resource");

export interface Resource<Data = unknown> {
  readonly [resourceBrand]: Data;
}

export type ResourceValue<ResourceType extends Resource> =
  ResourceType extends Resource<infer Data> ? Data : never;

interface ResourceHandle<Data> extends Resource<Data> {
  readonly [resourceKind]: true;
  readonly id: number;
  readonly layout: ReflectedTypeLayout;
  readonly pointer: number;
  readonly view: Cursor;
  readonly setter: (value: Data) => void;
}

function handle<Data>(resource: Resource<Data>): ResourceHandle<Data> {
  return resource as ResourceHandle<Data>;
}

export function isResource(value: unknown): value is Resource {
  return typeof value === "object" && value !== null && resourceKind in value;
}

export function resourceId(resource: Resource): number {
  return handle(resource).id;
}

export function resourceLayout(resource: Resource): ReflectedTypeLayout {
  return handle(resource).layout;
}

export function resourcePointer(resource: Resource): number {
  return handle(resource).pointer;
}

export function resource<const Schema extends ComponentSchema>(
  name: string,
  schema: Schema,
  initial: ComponentData<Schema>,
): Resource<ComponentData<Schema>> {
  const namePointer = allocateString(name);
  const fieldsPointer = allocateString(schemaSource(schema));
  const typePointer = wasm._malloc(8);
  const id = wasm._siecs_ts_resource_init(
    namePointer,
    fieldsPointer,
    typePointer,
  );
  const type = wasm.HEAPU64[typePointer >> 3]!;
  wasm._free(typePointer);
  wasm._free(fieldsPointer);
  wasm._free(namePointer);

  const layout = reflectType(type);
  const pointer = wasm._ecs_resource_rid(id);
  const setter = compileValueSetter(pointer, layout) as (
    value: ComponentData<Schema>,
  ) => void;
  const value = {
    [resourceKind]: true,
    id,
    layout,
    pointer,
    view: createView(layout, true),
    setter,
  } as ResourceHandle<ComponentData<Schema>>;
  setter(initial);
  return value;
}

export function getResource<ResourceType extends Resource>(
  resource: ResourceType,
): ResourceValue<ResourceType> {
  const value = handle(resource);
  refreshViewHeaps();
  value.view._base = value.pointer;
  return value.view as ResourceValue<ResourceType>;
}

export function setResource<ResourceType extends Resource>(
  resource: ResourceType,
  value: ResourceValue<ResourceType>,
): void {
  handle(resource).setter(value);
}

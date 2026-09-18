import { ptr } from "bun:ffi";
import { type ComponentData, type ComponentSchema, type ReflectedTypeLayout, reflectType, schemaSource } from "./component.js";
import { native } from "./runtime.js";
import { compileValueSetter } from "./set.js";
import { type Cursor, attachView, createView } from "./view.js";

declare const resourceBrand: unique symbol;
const resourceKind = Symbol("siecs.resource");
export interface Resource<Data = unknown> { readonly [resourceBrand]: Data; }
export type ResourceValue<ResourceType extends Resource> = ResourceType extends Resource<infer Data> ? Data : never;

interface ResourceHandle<Data> extends Resource<Data> {
  readonly [resourceKind]: true;
  readonly id: number;
  readonly layout: ReflectedTypeLayout;
  readonly pointer: number;
  readonly view: Cursor;
  readonly strings: boolean;
  readonly setter: (value: Data) => void;
}
function handle<Data>(resource: Resource<Data>): ResourceHandle<Data> { return resource as ResourceHandle<Data>; }
export function isResource(value: unknown): value is Resource { return typeof value === "object" && value !== null && resourceKind in value; }
export function resourceId(resource: Resource): number { return handle(resource).id; }
export function resourceLayout(resource: Resource): ReflectedTypeLayout { return handle(resource).layout; }
export function resourcePointer(resource: Resource): number { return handle(resource).pointer; }
export function resourceStrings(resource: Resource): boolean { return handle(resource).strings; }

/** Bind a native resource without overwriting its initial value or hooks. */
export function bindResource<Data>(id: number, type: bigint, stringFields = false): Resource<Data> {
  const layout = reflectType(type);
  const pointer = native.ecs_resource_rid(id);
  const write = compileValueSetter(layout, true);
  const buffers = [new Uint8Array(Math.max(layout.size, 1))];
  const views = [new DataView(buffers[0]!.buffer)];
  const pointers = [ptr(buffers[0]!)];
  const strings: Uint8Array[][] = [[]];
  let depth = 0;
  const setter = (value: Data) => {
    const index = depth++;
    if (!buffers[index]) {
      buffers[index] = new Uint8Array(Math.max(layout.size, 1));
      views[index] = new DataView(buffers[index]!.buffer);
      pointers[index] = ptr(buffers[index]!);
      strings[index] = [];
    }
    try {
      write(views[index]!, value, strings[index]!);
      native.ecs_set_resource_rid(id, pointers[index]!);
    } finally { depth--; }
  };
  const view = createView(layout, true, false, stringFields);
  attachView(view, pointer, layout.size);
  return { [resourceKind]: true, id, layout, pointer, view, strings: stringFields, setter } as ResourceHandle<Data>;
}
export function resource<const Schema extends ComponentSchema>(name: string, schema: Schema, initial: ComponentData<Schema>): Resource<ComponentData<Schema>> {
  const type = new BigUint64Array(1);
  const id = native.siecs_ts_resource_init(name, schemaSource(schema), type);
  const value = bindResource<ComponentData<Schema>>(id, type[0]!);
  handle(value).setter(initial);
  return value;
}
export function getResource<ResourceType extends Resource>(resource: ResourceType): ResourceValue<ResourceType> {
  const value = handle(resource);
  return value.view as ResourceValue<ResourceType>;
}
export function setResource<ResourceType extends Resource>(resource: ResourceType, value: ResourceValue<ResourceType>): void {
  handle(resource).setter(value);
}

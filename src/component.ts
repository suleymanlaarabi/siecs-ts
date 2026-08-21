import { allocateString, wasm } from "./runtime.js";
import { registerComponentSetter } from "./set.js";

export interface SireflectTypes {
  bool: boolean;
  char: number;
  u8: number;
  u16: number;
  u32: number;
  u64: bigint;
  i8: number;
  i16: number;
  i32: number;
  i64: bigint;
  f32: number;
  f64: number;
  uint8_t: number;
  uint16_t: number;
  uint32_t: number;
  uint64_t: bigint;
  int8_t: number;
  int16_t: number;
  int32_t: number;
  int64_t: bigint;
  float: number;
  double: number;
  short: number;
  int: number;
  long: number;
  ptr: number;
}

declare const componentBrand: unique symbol;
declare const arrayBrand: unique symbol;

export type Component<Data = unknown> = number & {
  readonly [componentBrand]: Data;
};

export interface ReflectedArray<
  Type = unknown,
  Count extends number = number,
> {
  readonly type: Type;
  readonly count: Count;
  readonly [arrayBrand]: true;
}

export type ComponentField =
  | string
  | Component<unknown>
  | ReflectedArray<unknown, number>;

export type ComponentSchema = Readonly<Record<string, ComponentField>>;

export type FixedArray<Type, Count extends number> = Type[] & {
  readonly length: Count;
};

type FieldValue<Field> = Field extends Component<infer Data>
  ? Data
  : Field extends ReflectedArray<infer Type, infer Count>
    ? FixedArray<FieldValue<Type>, Count>
    : Field extends keyof SireflectTypes
      ? SireflectTypes[Field]
      : Field extends `${string}*`
        ? number
        : unknown;

export type ComponentData<Schema extends ComponentSchema> = {
  -readonly [Key in keyof Schema]: FieldValue<Schema[Key]>;
};

export type ComponentValue<ComponentType extends Component> =
  ComponentType extends Component<infer Data> ? Data : never;

export interface ReflectedFieldLayout {
  name: string;
  offset: number;
  type: ReflectedTypeLayout;
}

export interface ReflectedTypeLayout {
  kind: number;
  size: number;
  fields?: ReflectedFieldLayout[];
  element?: ReflectedTypeLayout;
  count?: number;
}

const componentNames: string[] = [];
const typeLayouts = new Map<bigint, ReflectedTypeLayout>();

export function array<
  const Type extends ComponentField,
  const Count extends number,
>(type: Type, count: Count): ReflectedArray<Type, Count> {
  return { type, count } as ReflectedArray<Type, Count>;
}

function fieldDeclaration(name: string, field: ComponentField): string {
  if (typeof field === "object") {
    return fieldDeclaration(
      `${name}[${field.count}]`,
      field.type as ComponentField,
    );
  }

  const type = typeof field === "number" ? componentNames[field] : field;
  return `${type} ${name};`;
}

function schemaSource(schema: ComponentSchema | undefined): string {
  return `{ ${Object.entries(schema ?? {})
    .map(([name, field]) => fieldDeclaration(name, field))
    .join(" ")} }`;
}

export function component(name: string): Component<Record<never, never>>;
export function component<const Schema extends ComponentSchema>(
  name: string,
  schema: Schema,
): Component<ComponentData<Schema>>;
export function component(
  name: string,
  schema?: ComponentSchema,
): Component<unknown> {
  const namePointer = allocateString(name);
  const fieldsPointer = allocateString(schemaSource(schema));
  const id = wasm._siecs_ts_component_init(namePointer, fieldsPointer);
  wasm._free(fieldsPointer);
  wasm._free(namePointer);
  componentNames[id] = name;
  const registered = id as Component<unknown>;
  registerComponentSetter(registered, componentLayout(registered));
  return registered;
}

function reflectType(type: bigint): ReflectedTypeLayout {
  const cached = typeLayouts.get(type);
  if (cached) {
    return cached;
  }

  const kind = wasm._siecs_ts_type_kind(type);
  const layout: ReflectedTypeLayout = {
    kind,
    size: wasm._siecs_ts_type_size(type),
  };
  typeLayouts.set(type, layout);

  if (kind === 16) {
    const count = wasm._siecs_ts_type_field_count(type);
    const fields = new Array<ReflectedFieldLayout>(count);

    for (let index = 0; index < count; index++) {
      fields[index] = {
        name: wasm.UTF8ToString(wasm._siecs_ts_type_field_name(type, index)),
        offset: wasm._siecs_ts_type_field_offset(type, index),
        type: reflectType(wasm._siecs_ts_type_field_type(type, index)),
      };
    }

    layout.fields = fields;
  } else if (kind === 17) {
    layout.element = reflectType(wasm._siecs_ts_type_element(type));
    layout.count = wasm._siecs_ts_type_element_count(type);
  }

  return layout;
}

export function componentLayout(component: Component): ReflectedTypeLayout {
  return reflectType(wasm._siecs_ts_component_type(component));
}

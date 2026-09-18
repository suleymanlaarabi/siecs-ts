import { expect, test } from "bun:test";
import { Camera, Color, component, Cuboid, entity, getResource, Keyboard, Key, Position3d, query, resource, setResource, WindowConfig, write, system, OnSet, observer } from "../index.ts";
import { ptr } from "bun:ffi";

test("binds rendering components to the native ECS and reads native pointer fields", () => {
  expect(typeof Position3d).toBe("number");
  const object = entity().set(Position3d, { x: 2, y: 3, z: 4 })
    .set(Color, { r: 10, g: 20, b: 30, a: 255 })
    .set(Cuboid, { width: 1, height: 2, depth: 3 });
  expect(query({ position: Position3d }).map(row => row.position.x)).toContain(2);
  expect(object.has(Camera)).toBe(false);
  expect(getResource(Keyboard).keys.length).toBe(13);
  expect(typeof getResource(Keyboard).keys[Key.I]).toBe("boolean");
});

test("preserves native pointers and Linux long values without truncation", () => {
  const buffer = new Uint8Array(8);
  const address = ptr(buffer);
  const values = resource("NativeWideValues", { pointer: "ptr", signed: "long", unsigned: "u64" },
    { pointer: address, signed: -0x123456789abcdefn, unsigned: 0xfedcba9876543210n });
  expect(getResource(values).pointer).toBe(address);
  expect(getResource(values).signed).toBe(-0x123456789abcdefn);
  expect(getResource(values).unsigned).toBe(0xfedcba9876543210n);
});

test("owns the string storage of native window configuration resources", () => {
  const original = { ...getResource(WindowConfig) };
  expect(original.title).toBe("R-Type");
  setResource(WindowConfig, { width: 800, height: 600, title: "Native configuration" });
  Bun.gc(true);
  expect(getResource(WindowConfig).title).toBe("Native configuration");
  setResource(WindowConfig, original);
});

test("uses native EngineKey enum width without overwriting its neighboring field", () => {
  const Input = component("NativeEnumInput", { key: "EngineKey", marker: "u8" });
  entity().set(Input, { key: Key.I, marker: 77 });
  query({ input: Input }).each(row => {
    expect(row.input.key).toBe(Key.I);
    expect(row.input.marker).toBe(77);
  });
});

test("keeps user char pointers numeric and writable", () => {
  const bytes = new Uint8Array([65, 0]);
  const address = ptr(bytes);
  const Address = component("NativeCharAddress", { address: "char*" });
  entity().set(Address, { address });
  query({ value: write(Address) }).each(({ value }) => {
    expect(value.address).toBe(address);
    value.address = 0;
    expect(value.address).toBe(0);
  });
  const location = resource("NativeCharResource", { address: "char*" }, { address });
  expect(getResource(location).address).toBe(address);
});

test("rejects oversized native query descriptors before copying terms", () => {
  const Value = component("NativeCapacityValue", { value: "u32" });
  const descriptor = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`field${index}`, Value]));
  expect(() => query(descriptor)).toThrow(RangeError);
  expect(() => system({ query: descriptor, each: () => {} })).toThrow(RangeError);
  expect(() => observer(OnSet, descriptor, () => {})).toThrow(RangeError);
  const settings = resource("NativeCapacityResource", { value: "u32" }, { value: 1 });
  const resources = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`resource${index}`, settings]));
  expect(() => query(resources)).toThrow(RangeError);
  const dependency = system({ each: () => {} });
  expect(() => system({ each: () => {}, options: { after: Array(17).fill(dependency) } })).toThrow(RangeError);
});

import { expect, test } from "bun:test";
import {
  array,
  component,
  entity,
  filter,
  query,
  without,
  write,
} from "../index.ts";
import { wasm } from "../src/runtime.ts";

test("iterates named read/write fields with filter and without terms", () => {
  const Position = component("QueryPosition", { x: "f32", y: "f32" });
  const Velocity = component("QueryVelocity", { x: "f32", y: "f32" });
  const Enemy = component("QueryEnemy");
  const Dead = component("QueryDead");

  const first = entity();
  first.add(Position);
  first.add(Velocity);
  first.add(Enemy);

  const second = entity();
  second.add(Position);
  second.add(Velocity);
  second.add(Enemy);
  second.add(Dead);

  const movement = query({
    position: write(Position),
    velocity: Velocity,
    enemy: filter(Enemy),
    dead: without(Dead),
  });

  let count = 0;
  movement.each((row) => {
    row.position.x = 10;
    row.position.y = 20;
    expect(row.velocity.x).toBe(0);
    count++;
  });

  expect(count).toBe(1);

  query({ position: Position, enemy: filter(Enemy) }).each((row) => {
    if (row.entity.entity === first.entity) {
      expect(row.position.x).toBe(10);
      expect(row.position.y).toBe(20);
    }
  });
});

test("reflects nested structs and fixed arrays directly over WASM storage", () => {
  const Vec2 = component("QueryVec2", { x: "f32", y: "f32" });
  const Transform = component("QueryTransform", {
    position: Vec2,
    history: array(Vec2, 2),
    weights: array("f32", 4),
    owner: "u64",
    active: "bool",
    pointer: "ptr",
  });
  const object = entity();
  object.add(Transform);

  query({ transform: write(Transform) }).each((row) => {
    row.transform.position.x = 1;
    row.transform.position.y = 2;
    row.transform.history[0]!.x = 3;
    row.transform.history[1]!.y = 4;
    row.transform.weights[2] = 5;
    row.transform.owner = object.entity;
    row.transform.active = true;
    row.transform.pointer = 64;
  });

  query({ transform: Transform }).each((row) => {
    expect(row.transform.position.x).toBe(1);
    expect(row.transform.position.y).toBe(2);
    expect(row.transform.history[0]!.x).toBe(3);
    expect(row.transform.history[1]!.y).toBe(4);
    expect(row.transform.weights[2]).toBe(5);
    expect(row.transform.owner).toBe(object.entity);
    expect(row.transform.active).toBe(true);
    expect(row.transform.pointer).toBe(64);
  });
});

test("reuses the row, entity and component views", () => {
  const Value = component("QueryReuseValue", { value: "i32" });
  const first = entity();
  const second = entity();
  first.add(Value);
  second.add(Value);

  const values = query({ value: write(Value) });
  let borrowedRow: unknown;
  let borrowedEntity: unknown;
  let borrowedValue: unknown;
  let count = 0;

  values.each((row) => {
    borrowedRow ??= row;
    borrowedEntity ??= row.entity;
    borrowedValue ??= row.value;
    expect(row === borrowedRow).toBe(true);
    expect(row.entity === borrowedEntity).toBe(true);
    expect(row.value === borrowedValue).toBe(true);
    row.value.value = ++count;
  });

  expect(count).toBe(2);
});

test("persistent queries see archetypes created after query initialization", () => {
  const Value = component("QueryLateValue", { value: "i32" });
  const Late = component("QueryLateTag");
  const values = query({ value: Value });

  const first = entity();
  first.add(Value);

  let before = 0;
  values.each(() => before++);

  const second = entity();
  second.add(Value);
  second.add(Late);

  let after = 0;
  values.each(() => after++);

  expect(after).toBe(before + 1);
});

test("refreshes borrowed heap views after WASM memory growth between passes", () => {
  const Value = component("QueryGrowthValue", { value: "i32" });
  const object = entity();
  object.add(Value);
  const values = query({ value: write(Value) });

  values.each((row) => (row.value.value = 7));
  const previousBuffer = wasm.HEAPU8.buffer;
  const allocation = wasm._malloc(wasm.HEAPU8.byteLength);
  wasm._free(allocation);

  expect(wasm.HEAPU8.buffer).not.toBe(previousBuffer);
  values.each((row) => {
    expect(row.value.value).toBe(7);
    row.value.value = 9;
  });
});

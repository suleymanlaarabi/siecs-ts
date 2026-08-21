import { expect, test } from "bun:test";
import { add, array, component, entity, has, query, remove, set } from "../index.ts";

test("registers data components and tags and adds them to entities", () => {
  const Position = component("Position", {
    x: "f32",
    y: "f32",
  });
  const Enemy = component("Enemy");
  const player = entity();

  expect(Position).toBeGreaterThan(0);
  expect(Enemy).toBeGreaterThan(0);
  expect(Position).not.toBe(Enemy);

  expect(player.has(Position)).toBe(false);
  player.add(Position);
  expect(player.has(Position)).toBe(true);
  player.remove(Position);
  expect(player.has(Position)).toBe(false);

  add(player.entity, Enemy);
  expect(has(player.entity, Enemy)).toBe(true);
  remove(player.entity, Enemy);
  expect(has(player.entity, Enemy)).toBe(false);
});

test("keeps component registration idempotent", () => {
  const first = component("Velocity", { x: "f32", y: "f32" });
  const second = component("Velocity", { x: "f32", y: "f32" });

  expect(second).toBe(first);
});

test("sets component storage directly from typed JavaScript values", () => {
  const Vec2 = component("SetVec2", { x: "f32", y: "f32" });
  const Transform = component("SetTransform", {
    position: Vec2,
    history: array(Vec2, 2),
    weights: array("f32", 3),
    owner: "u64",
    enabled: "bool",
    pointer: "ptr",
  });
  const object = entity();

  expect(
    object.set(Transform, {
      position: { x: 1, y: 2 },
      history: [
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ],
      weights: [7, 8, 9],
      owner: object.entity,
      enabled: true,
      pointer: 64,
    }),
  ).toBe(object);
  expect(object.has(Transform)).toBe(true);

  set(object.entity, Vec2, { x: 10, y: 20 });

  query({ transform: Transform, vector: Vec2 }).each((row) => {
    expect(row.transform.position.x).toBe(1);
    expect(row.transform.position.y).toBe(2);
    expect(row.transform.history[0]!.x).toBe(3);
    expect(row.transform.history[0]!.y).toBe(4);
    expect(row.transform.history[1]!.x).toBe(5);
    expect(row.transform.history[1]!.y).toBe(6);
    expect(row.transform.weights[0]).toBe(7);
    expect(row.transform.weights[1]).toBe(8);
    expect(row.transform.weights[2]).toBe(9);
    expect(row.transform.owner).toBe(object.entity);
    expect(row.transform.enabled).toBe(true);
    expect(row.transform.pointer).toBe(64);
    expect(row.vector.x).toBe(10);
    expect(row.vector.y).toBe(20);
  });
});

import { expect, test } from "bun:test";
import {
  ChildOf,
  defer,
  Disabled,
  entity,
  has,
  isAlive,
  relate,
  target,
} from "../index.ts";

test("exposes native builtin ids", () => {
  const child = entity().add(Disabled);
  const parent = entity();

  expect(ChildOf).toBeGreaterThan(0);
  expect(Disabled).toBeGreaterThan(0);
  expect(has(child.entity, Disabled)).toBe(true);
  relate(child.entity, ChildOf, parent.entity);
  expect(target(child.entity, ChildOf)).toBe(parent.entity);
});

test("cascades ChildOf deletion while flushing deferred commands", () => {
  const parent = entity();
  const child = entity().relate(ChildOf, parent);
  const grandchild = entity().relate(ChildOf, child);

  defer(() => parent.kill());

  expect(isAlive(parent.entity)).toBe(false);
  expect(isAlive(child.entity)).toBe(false);
  expect(isAlive(grandchild.entity)).toBe(false);
});

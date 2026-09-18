import { expect, test } from "bun:test";
import { ChildOf, Disabled, entity, has, relate, target } from "../index.ts";

test("exposes native builtin ids", () => {
  const child = entity().add(Disabled);
  const parent = entity();

  expect(ChildOf).toBeGreaterThan(0);
  expect(Disabled).toBeGreaterThan(0);
  expect(has(child.entity, Disabled)).toBe(true);
  relate(child.entity, ChildOf, parent.entity);
  expect(target(child.entity, ChildOf)).toBe(parent.entity);
});

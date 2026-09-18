import { expect, test } from "bun:test";
import {
  ChildOf,
  defer,
  entity,
  hasRelation,
  relate,
  target,
  unrelate,
} from "../index.ts";

test("relates, retargets and unrelates ChildOf", () => {
  const child = entity();
  const firstParent = entity();
  const secondParent = entity();

  relate(child.entity, ChildOf, firstParent.entity);
  expect(hasRelation(child.entity, ChildOf)).toBe(true);
  expect(target(child.entity, ChildOf)).toBe(firstParent.entity);
  child.relate(ChildOf, secondParent);
  expect(child.target(ChildOf)).toBe(secondParent.entity);
  child.unrelate(ChildOf);
  expect(child.hasRelation(ChildOf)).toBe(false);
  expect(target(child.entity, ChildOf)).toBe(0n);
});

test("flushes deferred relation changes", () => {
  const child = entity();
  const parent = entity();

  defer(() => {
    child.relate(ChildOf, parent);
    expect(child.hasRelation(ChildOf)).toBe(false);
  });
  expect(child.target(ChildOf)).toBe(parent.entity);

  defer(() => child.unrelate(ChildOf));
  expect(child.target(ChildOf)).toBe(0n);
});

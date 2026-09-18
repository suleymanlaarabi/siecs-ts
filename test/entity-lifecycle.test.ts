import { expect, test } from "bun:test";
import { createEntity, defer, entity, isAlive, kill } from "../index.ts";

test("createEntity returns a live raw entity id", () => {
  const id = createEntity();

  expect(typeof id).toBe("bigint");
  expect(isAlive(id)).toBe(true);

  kill(id);
  expect(isAlive(id)).toBe(false);
});

test("reports liveness and kills through function and Entity APIs", () => {
  const first = entity();
  const second = entity();

  expect(isAlive(first.entity)).toBe(true);
  expect(first.isAlive()).toBe(true);
  kill(first.entity);
  second.kill();
  expect(isAlive(first.entity)).toBe(false);
  expect(second.isAlive()).toBe(false);
});

test("flushes deferred kills at the outermost defer end", () => {
  const object = entity();

  defer(() => {
    object.kill();
    expect(object.isAlive()).toBe(true);
  });

  expect(object.isAlive()).toBe(false);
});

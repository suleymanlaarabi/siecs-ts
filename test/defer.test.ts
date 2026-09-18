import { expect, test } from "bun:test";
import { component, defer, entity, query, set } from "../index.ts";

test("supports nested scopes and always closes after an exception", () => {
  const Value = component("DeferExceptionValue", { value: "i32" });
  const object = entity();

  expect(() => defer(() => {
    defer(() => set(object.entity, Value, { value: 1 }));
    throw new Error("stop");
  })).toThrow("stop");

  let value = 0;
  query({ value: Value }).each((row) => value = row.value.value);
  expect(value).toBe(1);
});

import { expect, test } from "bun:test";
import { component, defer, entity, observer, OnSet, query, set } from "../index.ts";

test("sets absent and existing components through the deferred command buffer", () => {
  const Value = component("DeferredSetValue", { value: "i32" });
  const object = entity();
  const seen: number[] = [];
  observer(OnSet, { value: Value }, (row) => seen.push(row.value.value));

  defer(() => {
    set(object.entity, Value, { value: 1 });
    set(object.entity, Value, { value: 2 });
    expect(seen).toEqual([]);
  });

  expect(seen).toEqual([0]);
  query({ value: Value }).each((row) => expect(row.value.value).toBe(2));
});

test("keeps an outer setter value during reentrant OnSet", () => {
  const Value = component("ReentrantSetValue", { value: "i32" });
  const outer = entity();
  const inner = entity();
  let reentered = false;

  observer(OnSet, { value: Value }, (row) => {
    if (!reentered && row.entity.entity === outer.entity) {
      reentered = true;
      set(inner.entity, Value, { value: 2 });
    }
  });
  set(outer.entity, Value, { value: 1 });

  const values = query({ value: Value }).map((row) => row.value.value).sort();
  expect(values).toEqual([1, 2]);
});

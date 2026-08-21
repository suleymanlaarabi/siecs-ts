import { expect, test } from "bun:test";
import {
  component,
  disableObserver,
  emit,
  enableObserver,
  entity,
  event,
  observer,
  OnAdd,
  OnSet,
  resource,
  write,
} from "../index.ts";

test("notifies native OnSet observers after the direct write", () => {
  const Value = component("ObserverSetValue", { value: "i32" });
  const object = entity().set(Value, { value: 1 });
  const seen: number[] = [];
  const changed = observer(OnSet, { value: Value }, (row) => {
    seen.push(row.value.value);
  });

  object.set(Value, { value: 2 });
  disableObserver(changed);
  object.set(Value, { value: 3 });
  enableObserver(changed);
  object.set(Value, { value: 4 });

  expect(seen).toEqual([2, 4]);
});

test("uses SIECS OnAdd matching and borrowed observer rows", () => {
  const Value = component("ObserverAddValue", { value: "i32" });
  let calls = 0;
  let borrowed: unknown;

  observer(OnAdd, { value: Value }, (row) => {
    borrowed ??= row;
    expect(row as unknown).toBe(borrowed);
    expect(row.value.value).toBe(0);
    calls++;
  });

  entity().set(Value, { value: 9 });
  expect(calls).toBe(1);
});

test("notifies OnSet for zero-sized tags", () => {
  const Selected = component("ObserverSelectedTag");
  const object = entity().add(Selected);
  let calls = 0;
  observer(OnSet, { selected: Selected }, () => calls++);

  object.set(Selected, {});
  expect(calls).toBe(1);
});

test("delivers typed custom payloads through native observer dispatch", () => {
  const Health = component("ObserverHealth", { value: "i32" });
  const Rules = resource("ObserverRules", { scale: "i32" }, { scale: 2 });
  const Damage = event<{ amount: number }>();
  const target = entity().set(Health, { value: 10 });
  const payloads: number[] = [];

  observer(Damage, { health: write(Health), rules: Rules }, (row, payload) => {
    payloads.push(payload.amount);
    row.health.value -= payload.amount * row.rules.scale;
    if (payload.amount === 3) emit(target, Damage, { amount: 1 });
  });

  emit(target, Damage, { amount: 3 });

  let health = 0;
  const Inspect = event<void>();
  observer(Inspect, { health: Health }, (row) => {
    health = row.health.value;
  });
  emit(target, Inspect);
  expect(health).toBe(2);
  expect(payloads).toEqual([3, 1]);
});

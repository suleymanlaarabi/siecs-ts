import { expect, test } from "bun:test";
import {
  component,
  entity,
  getResource,
  query,
  resource,
  setResource,
  write,
} from "../index.ts";

test("uses reflected resources directly in queries", () => {
  const Position = component("ResourceQueryPosition", { x: "f32" });
  const Time = resource(
    "ResourceQueryTime",
    { delta: "f32", frame: "u32" },
    { delta: 0.5, frame: 1 },
  );
  entity().set(Position, { x: 2 });

  query({ position: write(Position), time: Time }).each((row) => {
    row.position.x += row.time.delta;
  });

  let value = 0;
  query({ position: Position }).each((row) => (value = row.position.x));
  expect(value).toBe(2.5);

  setResource(Time, { delta: 0.25, frame: 2 });
  expect(getResource(Time).delta).toBe(0.25);
  expect(getResource(Time).frame).toBe(2);
});

test("runs a resource-only query once without an entity", () => {
  const Clock = resource("ResourceOnlyClock", { tick: "u32" }, { tick: 7 });
  let calls = 0;

  query({ clock: Clock }).each((row) => {
    calls++;
    expect(row.clock.tick).toBe(7);
    expect("entity" in row).toBe(false);
  });

  expect(calls).toBe(1);
});

test("keeps names of native resources after FFI string buffers are reused", () => {
  resource("NativeResourceFirst", { value: "u32" }, { value: 1 });
  const larger = resource("NativeResourceOther", { a: "u32", b: "u32" }, { a: 2, b: 3 });
  setResource(larger, { a: 4, b: 5 });
  expect(getResource(larger).a).toBe(4);
  expect(getResource(larger).b).toBe(5);
});

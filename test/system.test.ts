import { expect, test } from "bun:test";
import {
  component,
  disableSystem,
  enableSystem,
  entity,
  phase,
  PostRender,
  resource,
  runPhase,
  runSystem,
  system,
  write,
} from "../index.ts";

test("runs typed systems once per matching entity", () => {
  const Position = component("SystemPosition", { x: "f32" });
  const Time = resource("SystemTime", { delta: "f32" }, { delta: 0.5 });
  entity().set(Position, { x: 1 });
  entity().set(Position, { x: 2 });
  let calls = 0;

  const Move = system(
    "TsMove",
    { position: write(Position), time: Time },
    (row, context) => {
      row.position.x += row.time.delta;
      expect(typeof context.deltaTime).toBe("number");
      calls++;
    },
  );

  runSystem(Move);
  expect(calls).toBe(2);

  disableSystem(Move);
  runSystem(Move);
  expect(calls).toBe(2);
  enableSystem(Move);
  runSystem(Move);
  expect(calls).toBe(4);
});

test("runs resource-only systems once and honors same-phase dependencies", () => {
  const State = resource("SystemOrderState", { value: "i32" }, { value: 0 });
  const Update = phase("TsOrderedUpdate", { after: PostRender });
  const order: string[] = [];

  const First = system(
    "TsFirst",
    { state: write(State) },
    (row) => {
      row.state.value++;
      order.push("first");
    },
    { phase: Update },
  );
  system(
    "TsSecond",
    { state: State },
    (row) => {
      expect(row.state.value).toBe(1);
      expect("entity" in row).toBe(false);
      order.push("second");
    },
    { phase: Update, after: [First] },
  );

  runPhase(Update);
  expect(order).toEqual(["first", "second"]);
});

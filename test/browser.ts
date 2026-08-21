import { component, entity, filter, query, write } from "../index.ts";

const Position = component("Position", { x: "f32", y: "f32" });
const Enemy = component("Enemy");
const first = entity();
const second = entity();

first.add(Position);
first.add(Enemy);
const added = first.has(Position) && first.has(Enemy);
first.remove(Position);
const removed = !first.has(Position) && first.has(Enemy);

first.set(Position, { x: 40, y: 2 });
let queried = false;
query({ position: write(Position), enemy: filter(Enemy) }).each((row) => {
  row.position.x += row.position.y;
  queried = row.position.x === 42;
});

document.body.textContent =
  typeof first.entity === "bigint" &&
  second.entity !== first.entity &&
  added &&
  removed &&
  queried &&
  Position > 0 &&
  Enemy > 0 &&
  Number(Position) !== Number(Enemy)
    ? "SIECS_WASM_OK"
    : "SIECS_WASM_FAIL";

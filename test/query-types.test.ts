import {
  Name,
  component,
  entity,
  event,
  filter,
  observer,
  query,
  resource,
  system,
  write,
} from "../index.ts";

const Position = component("QueryTypePosition", { x: "f32", y: "f32" });
const Enemy = component("QueryTypeEnemy");
const Time = resource("QueryTypeTime", { delta: "f32" }, { delta: 0 });

if (false) {
  const player = entity();
  player.set(Position, { x: 1, y: 2 });
  // @ts-expect-error all component fields are required
  player.set(Position, { x: 1 });
  // @ts-expect-error component field types come from its schema
  player.set(Position, { x: "1", y: 2 });

  query({ position: Position }).each((row) => {
    // @ts-expect-error read terms are deeply readonly
    row.position.x = 1;
  });

  query({ position: write(Position) }).each((row) => {
    row.position.x = 1;
  });

  query({ name: Name }).each((row) => {
    const value: string = row.name.value;
    // @ts-expect-error Name must be written through setName or set(Name, ...)
    row.name.value = "Player";
  });

  // @ts-expect-error Name does not permit direct write query access
  query({ name: write(Name) });

  query({ enemy: filter(Enemy) }).each((row) => {
    // @ts-expect-error filter terms are not exposed on the row
    row.enemy;
  });

  query({ time: Time }).each((row) => {
    // @ts-expect-error resources are readonly by default
    row.time.delta = 1;
    // @ts-expect-error resource-only queries have no entity
    row.entity;
  });

  system({
    name: "TypeSystem",
    query: { time: write(Time) },
    each: (row) => {
      row.time.delta = 1;
      // @ts-expect-error resource-only systems have no entity
      row.entity;
    },
  });

  const Damage = event<{ amount: number }>();
  observer(Damage, { position: write(Position) }, (row, payload) => {
    row.position.x -= payload.amount;
    row.entity;
  });
}

import { component, entity, filter, query, write } from "../index.ts";

const Position = component("QueryTypePosition", { x: "f32", y: "f32" });
const Enemy = component("QueryTypeEnemy");

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

  query({ enemy: filter(Enemy) }).each((row) => {
    // @ts-expect-error filter terms are not exposed on the row
    row.enemy;
  });
}

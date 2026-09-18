import {
  component,
  entity,
  fini,
  query,
  runSystem,
  system,
  write,
} from "../index.ts";

try {
  const Position = component("ExamplePosition", { x: "f32", y: "f32" });
  const Velocity = component("ExampleVelocity", { x: "f32", y: "f32" });
  entity().set(Position, { x: 0, y: 0 }).set(Velocity, { x: 2, y: 1 });
  const Move = system({
    query: { position: write(Position), velocity: Velocity },
    each: ({ position, velocity }) => {
      position.x += velocity.x;
      position.y += velocity.y;
    },
  });
  runSystem(Move);
  query({ position: Position }).each(({ position }) =>
    console.log(position.x, position.y),
  );
} finally {
  fini();
}

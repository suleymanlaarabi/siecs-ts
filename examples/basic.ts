import { component, entity, query, write, progress, system } from "..";

const Position = component("Position", {
  x: "f32",
  y: "f32",
});

const Velocity = component("Velocity", {
  x: "f32",
  y: "f32",
});

entity().set(Position, { x: 0, y: 0 }).set(Velocity, { x: 1, y: 1 });
entity().add(Position).add(Velocity);
entity().add(Position).add(Velocity);

system(
  "Move",
  {
    position: write(Position),
    velocity: Velocity,
  },
  ({ position, velocity }) => {
    position.x += velocity.x;
    position.y += velocity.y;
  },
);

progress();

query({ position: Position }).each(({ position }) => {
  console.log(position.x, position.y);
  console.log(position);
});

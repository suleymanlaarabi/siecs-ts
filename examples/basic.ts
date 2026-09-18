import { component, entity, progress, query, system } from "../index";

const Position = component("Position", {
  x: "f32",
  y: "f32",
});

const Velocity = component("Velocity", {
  x: "f32",
  y: "f32",
});

const player = entity(Position, Velocity);
entity(Position, Velocity);

query({}).map((e) => e);

system({
  each({ entity }) {
    console.log(entity);
  },
});

progress();

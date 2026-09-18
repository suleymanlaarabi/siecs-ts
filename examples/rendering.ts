import {
  AmbientLight,
  Bloom,
  BloomSettings,
  Camera,
  Color,
  Cuboid,
  entity,
  fini,
  Keyboard,
  Key,
  Position3d,
  Rotation3d,
  run,
  setResource,
  Sky,
  Static,
  Sun,
  system,
  write,
  Shadows,
} from "../index.ts";

try {
  setResource(Sky, { color: { r: 13, g: 18, b: 32, a: 255 } });
  setResource(AmbientLight, {
    color: { r: 180, g: 195, b: 230, a: 255 },
    intensity: 0.3,
  });
  setResource(Sun, {
    x: -0.6,
    y: -1,
    z: -0.4,
    color: { r: 255, g: 240, b: 215, a: 255 },
    intensity: 1.5,
  });
  setResource(BloomSettings, { enabled: true, threshold: 0.8, intensity: 0.5 });
  setResource(Sky, {
    color: { r: 13, g: 18, b: 32, a: 255 },
  });
  setResource(Shadows, {
    enabled: true,
    distance: 50,
  });

  entity()
    .set(Camera, { fov: 60 })
    .set(Position3d, { x: 0, y: 2, z: 10 })
    .set(Rotation3d, { pitch: -0.12, yaw: 0, roll: 0 });

  entity(Static)
    .set(Position3d, { x: 0, y: -1.5, z: 0 })
    .set(Cuboid, { width: 12, height: 0.3, depth: 8 })
    .set(Color, { r: 70, g: 80, b: 105, a: 255 });

  entity()
    .set(Position3d, { x: -1.8, y: 0, z: 0 })
    .set(Cuboid, { width: 2, height: 2, depth: 2 })
    .set(Color, { r: 70, g: 175, b: 255, a: 255 })
    .set(Bloom, { intensity: 1.2 })
    .set(Rotation3d, { pitch: 0.2, yaw: 0, roll: 0 });

  entity(Static)
    .set(Position3d, { x: 1.8, y: 0, z: -1 })
    .set(Cuboid, { width: 2, height: 2, depth: 2 })
    .set(Color, { r: 255, g: 130, b: 75, a: 255 })
    .set(Bloom, { intensity: 0.6 });

  system({
    query: { rotation: write(Rotation3d), cuboid: Cuboid, keyboard: Keyboard },
    each: ({ rotation, keyboard }, { deltaTime }) => {
      const direction = keyboard.keys[Key.Left] ? -1 : 1;
      rotation.yaw += deltaTime * direction;
    },
  });
  run();
} finally {
  fini();
}

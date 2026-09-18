import { Camera, Color, Cuboid, entity, getResource, GlobalOrientation3d, Keyboard, Key, Position3d, query, Rotation3d, setResource, Shadows, WindowConfig, write } from "../index.ts";

if (false) {
  entity().set(Position3d, { x: 1, y: 2, z: 3 })
    .set(Rotation3d, { pitch: 0, yaw: 1, roll: 0 })
    .set(Cuboid, { width: 1, height: 2, depth: 3 })
    .set(Color, { r: 255, g: 0, b: 0, a: 255 })
    .set(Camera, { fov: 60 });
  // @ts-expect-error native component fields remain required
  entity().set(Position3d, { x: 1, y: 2 });
  // @ts-expect-error native component fields are numeric
  entity().set(Camera, { fov: "60" });
  query({ position: Position3d, keyboard: Keyboard }).each(row => {
    const pressed: boolean = row.keyboard.keys[Key.Space]!;
    const count: 13 = row.keyboard.keys.length;
    // @ts-expect-error native read fields remain readonly
    row.position.x = 1;
    // @ts-expect-error keyboard arrays are readonly in read queries
    row.keyboard.keys[Key.A] = true;
    void pressed; void count;
  });
  query({ position: write(Position3d), orientation: GlobalOrientation3d }).each(row => {
    row.position.x += row.orientation.w;
    // @ts-expect-error unrelated read fields remain readonly
    row.orientation.w = 1;
  });
  const title: string = getResource(WindowConfig).title;
  // @ts-expect-error string pointers are not exposed as numbers
  const pointer: number = getResource(WindowConfig).title;
  // @ts-expect-error title strings are changed through setResource
  getResource(WindowConfig).title = "New";
  setResource(Shadows, { enabled: true, distance: 35 });
  // @ts-expect-error resources retain their field types
  setResource(Shadows, { enabled: 1, distance: 35 });
  void title; void pointer;
}

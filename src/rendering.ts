import {
  bindComponent,
  type ComponentData,
  type ComponentSchema,
} from "./component.js";
import { bindResource, type Resource } from "./resource.js";
import { native } from "./runtime.js";

function nativeComponent<const Schema extends ComponentSchema>(
  name: string,
  _schema: Schema,
) {
  return bindComponent<ComponentData<Schema>>(
    native.siecs_ts_rendering_component_id(name),
    name,
  );
}
function nativeResource<Data>(name: string): Resource<Data> {
  return bindResource<Data>(
    native.siecs_ts_rendering_resource_id(name),
    native.siecs_ts_rendering_resource_type(name),
    name === "WindowConfig",
  );
}

const vec2 = { x: "f32", y: "f32" } as const;
const vec3 = { x: "f32", y: "f32", z: "f32" } as const;
export const Position2d = nativeComponent("Position2d", vec2);
export const Velocity2d = nativeComponent("Velocity2d", vec2);
export const GlobalPosition2d = nativeComponent("GlobalPosition2d", vec2);
export const Scale2d = nativeComponent("Scale2d", vec2);
export const GlobalScale2d = nativeComponent("GlobalScale2d", vec2);
export const Rotation2d = nativeComponent("Rotation2d", { value: "f32" });
export const GlobalRotation2d = nativeComponent("GlobalRotation2d", {
  value: "f32",
});
export const Position3d = nativeComponent("Position3d", vec3);
export const Velocity3d = nativeComponent("Velocity3d", vec3);
export const GlobalPosition3d = nativeComponent("GlobalPosition3d", vec3);
export const Rotation3d = nativeComponent("Rotation3d", {
  pitch: "f32",
  yaw: "f32",
  roll: "f32",
});
export const GlobalOrientation3d = nativeComponent("GlobalOrientation3d", {
  x: "f32",
  y: "f32",
  z: "f32",
  w: "f32",
});
export const Scale3d = nativeComponent("Scale3d", vec3);
export const GlobalScale3d = nativeComponent("GlobalScale3d", vec3);
export const Static = nativeComponent("Static", {});
export const Color = nativeComponent("Color", {
  r: "u8",
  g: "u8",
  b: "u8",
  a: "u8",
});
export const Cuboid = nativeComponent("Cuboid", {
  width: "f32",
  height: "f32",
  depth: "f32",
});
export const Cylinder = nativeComponent("Cylinder", {
  radius: "f32",
  height: "f32",
});
export const Sphere = nativeComponent("Sphere", { radius: "f32" });
export const Bloom = nativeComponent("Bloom", { intensity: "f32" });
export const Camera = nativeComponent("Camera", { fov: "f32" });

type Rgba = ComponentData<{ r: "u8"; g: "u8"; b: "u8"; a: "u8" }>;
export const WindowConfig = nativeResource<{
  width: number;
  height: number;
  readonly title: string;
}>("WindowConfig");
export const Sky = nativeResource<{ color: Rgba }>("Sky");
export const Sun = nativeResource<{
  x: number;
  y: number;
  z: number;
  color: Rgba;
  intensity: number;
}>("Sun");
export const AmbientLight = nativeResource<{ color: Rgba; intensity: number }>(
  "AmbientLight",
);
export const Fog = nativeResource<{ color: Rgba; start: number; end: number }>(
  "Fog",
);
export const Shadows = nativeResource<{ enabled: boolean; distance: number }>(
  "Shadows",
);
export const Multisampling = nativeResource<{ samples: number }>(
  "Multisampling",
);
export const BloomSettings = nativeResource<{
  enabled: boolean;
  threshold: number;
  intensity: number;
}>("BloomSettings");
export { Keyboard, Key } from "./input.js";

import { bindResource, type Resource } from "./resource.js";
import type { FixedArray } from "./component.js";
import { native } from "./runtime.js";

function nativeResource<Data>(name: string): Resource<Data> {
  return bindResource<Data>(
    native.siecs_ts_input_resource_id(name),
    native.siecs_ts_input_resource_type(name),
  );
}

export const Keyboard = nativeResource<{ keys: FixedArray<boolean, 13> }>("Keyboard");
export const Pointer = nativeResource<{
  x: number;
  y: number;
  delta_x: number;
  delta_y: number;
  wheel_x: number;
  wheel_y: number;
  buttons: number;
  pressed: number;
  released: number;
  pointer_id: number;
  pointer_type: number;
}>("Pointer");

export const Key = {
  A: 0, D: 1, W: 2, S: 3, Q: 4, Z: 5, E: 6,
  Left: 7, Right: 8, Up: 9, Down: 10, Space: 11, I: 12,
} as const;
export type Key = (typeof Key)[keyof typeof Key];

export const PointerType = {
  Mouse: 0,
  Touch: 1,
  Pen: 2,
} as const;
export type PointerType = (typeof PointerType)[keyof typeof PointerType];

export const PointerButton = {
  Primary: 1,
  Middle: 2,
  Secondary: 3,
  X1: 4,
  X2: 5,
} as const;
export type PointerButton = (typeof PointerButton)[keyof typeof PointerButton];

declare module "./component.js" {
  interface SireflectTypes {
    EngineKey: Key;
  }
}

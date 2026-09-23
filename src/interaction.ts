import { toArrayBuffer } from "bun:ffi";
import { bindComponent, type Component } from "./component.js";
import { type Entity, has, remove, set } from "./entity.js";
import { type Event, registerNativeEventDecoder } from "./observer.js";
import { native, read } from "./runtime.js";
import type { PointerType } from "./input.js";

export const PointerEvents = bindComponent<{ mask: number }>(
  native.siecs_ts_interaction_component_id("PointerEvents"),
  "PointerEvents",
);

export const PointerEventMask = {
  Enter: 1 << 0,
  Leave: 1 << 1,
  Move: 1 << 2,
  Down: 1 << 3,
  Up: 1 << 4,
  Cancel: 1 << 5,
  Click: 1 << 6,
  Press: 1 << 7,
  Wheel: 1 << 8,
} as const;

export interface PointerEventData {
  readonly target: bigint;
  readonly relatedTarget: bigint;
  readonly timestamp: bigint;
  readonly pointerId: number;
  readonly pointerType: PointerType;
  readonly button: number;
  readonly buttons: number;
  readonly clicks: number;
  readonly modifiers: number;
  readonly x: number;
  readonly y: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly wheelX: number;
  readonly wheelY: number;
  readonly rayOriginX: number;
  readonly rayOriginY: number;
  readonly rayOriginZ: number;
  readonly rayDirectionX: number;
  readonly rayDirectionY: number;
  readonly rayDirectionZ: number;
  readonly pointX: number;
  readonly pointY: number;
  readonly pointZ: number;
  readonly normalX: number;
  readonly normalY: number;
  readonly normalZ: number;
  readonly distance: number;
}

function nativeEvent(kind: number): Event<PointerEventData> {
  return native.siecs_ts_pointer_event_id(kind) as unknown as Event<PointerEventData>;
}
export const PointerEnter = nativeEvent(0);
export const PointerLeave = nativeEvent(1);
export const PointerMove = nativeEvent(2);
export const PointerDown = nativeEvent(3);
export const PointerUp = nativeEvent(4);
export const PointerCancel = nativeEvent(5);
export const Click = nativeEvent(6);
export const Press = nativeEvent(7);
export const Wheel = nativeEvent(8);

const offsets = new Uint32Array(toArrayBuffer(native.siecs_ts_pointer_event_abi(), 0, 29 * 4));
function decoder(): (pointer: number) => PointerEventData {
  const event = {} as PointerEventData;
  return (pointer) => {
    // The C payload is borrowed by SIECS; this object is reused per observer.
    const value = event as { -readonly [Key in keyof PointerEventData]: PointerEventData[Key] };
    value.target = read.u64(pointer, offsets[1]!);
    value.relatedTarget = read.u64(pointer, offsets[2]!);
    value.timestamp = read.u64(pointer, offsets[3]!);
    value.pointerId = read.u32(pointer, offsets[4]!);
    value.buttons = read.u32(pointer, offsets[5]!);
    value.modifiers = read.u16(pointer, offsets[6]!);
    value.pointerType = read.u8(pointer, offsets[7]!) as PointerType;
    value.button = read.u8(pointer, offsets[8]!);
    value.clicks = read.u8(pointer, offsets[9]!);
    value.x = read.f32(pointer, offsets[10]!); value.y = read.f32(pointer, offsets[11]!);
    value.deltaX = read.f32(pointer, offsets[12]!); value.deltaY = read.f32(pointer, offsets[13]!);
    value.wheelX = read.f32(pointer, offsets[14]!); value.wheelY = read.f32(pointer, offsets[15]!);
    value.rayOriginX = read.f32(pointer, offsets[16]!); value.rayOriginY = read.f32(pointer, offsets[17]!); value.rayOriginZ = read.f32(pointer, offsets[18]!);
    value.rayDirectionX = read.f32(pointer, offsets[19]!); value.rayDirectionY = read.f32(pointer, offsets[20]!); value.rayDirectionZ = read.f32(pointer, offsets[21]!);
    value.pointX = read.f32(pointer, offsets[22]!); value.pointY = read.f32(pointer, offsets[23]!); value.pointZ = read.f32(pointer, offsets[24]!);
    value.normalX = read.f32(pointer, offsets[25]!); value.normalY = read.f32(pointer, offsets[26]!); value.normalZ = read.f32(pointer, offsets[27]!);
    value.distance = read.f32(pointer, offsets[28]!);
    return event;
  };
}
for (const pointerEvent of [PointerEnter, PointerLeave, PointerMove, PointerDown, PointerUp, PointerCancel, Click, Press, Wheel]) {
  registerNativeEventDecoder(pointerEvent, decoder);
}

export function setPointerEvents(entity: bigint | Entity, mask: number): void {
  const target = typeof entity === "bigint" ? entity : entity.entity;
  if (mask === 0) {
    if (has(target, PointerEvents)) remove(target, PointerEvents);
    return;
  }
  if (!has(target, PointerEvents)) {
    set(target, PointerEvents, { mask });
    return;
  }
  if (read.u32(native.ecs_get_cid(target, PointerEvents)) === mask) return;
  set(target, PointerEvents, { mask });
}

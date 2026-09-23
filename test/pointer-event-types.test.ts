import { expect, test } from "bun:test";
import { ptr, toArrayBuffer } from "bun:ffi";
import {
  PointerEnter,
  PointerLeave,
  PointerMove,
  PointerDown,
  PointerUp,
  PointerCancel,
  Click,
  Press,
  Wheel,
  PointerEventMask,
  PointerEvents,
  entity,
  observer,
  setPointerEvents,
} from "../index.ts";
import { native } from "../src/runtime.ts";

test("uses distinct native event ids and decodes borrowed pointer payloads", () => {
  const events = [
    PointerEnter,
    PointerLeave,
    PointerMove,
    PointerDown,
    PointerUp,
    PointerCancel,
    Click,
    Press,
    Wheel,
  ] as const;
  const ids = events.map(event => event as unknown as number);
  expect(new Set(ids).size).toBe(9);
  expect(ids.every(id => id > 4)).toBe(true);

  const target = entity();
  setPointerEvents(target, PointerEventMask.Enter);
  let received: { target: bigint; x: number; distance: number } | undefined;
  observer(PointerEnter, { interactive: PointerEvents }, (_row, payload) => {
    received = { target: payload.target, x: payload.x, distance: payload.distance };
  });

  const offsets = new Uint32Array(toArrayBuffer(native.siecs_ts_pointer_event_abi(), 0, 29 * 4));
  const payload = new Uint8Array(offsets[0]!);
  const view = new DataView(payload.buffer);
  view.setBigUint64(offsets[1]!, target.entity, true);
  view.setFloat32(offsets[10]!, 42.5, true);
  view.setFloat32(offsets[28]!, 7, true);
  native.ecs_observer_trigger(target.entity, ids[0]!, ptr(payload));
  expect(received).toEqual({ target: target.entity, x: 42.5, distance: 7 });
});

if (false) {
  observer(PointerEnter, { interactive: PointerEvents }, (_row, payload) => {
    const point: number = payload.pointX;
    const id: bigint = payload.target;
    // @ts-expect-error payload data is borrowed and readonly
    payload.pointX = 1;
    void point; void id;
  });
}

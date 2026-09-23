import { expect, test } from "bun:test";
import {
  PointerEventMask,
  PointerEvents,
  entity,
  has,
  query,
  setPointerEvents,
} from "../index.ts";

test("binds PointerEvents as a native component and updates/removes it", () => {
  const target = entity();
  expect(has(target.entity, PointerEvents)).toBe(false);
  setPointerEvents(target, PointerEventMask.Enter | PointerEventMask.Click);
  expect(has(target.entity, PointerEvents)).toBe(true);
  expect(query({ events: PointerEvents }).map(row => row.events.mask)).toContain(
    PointerEventMask.Enter | PointerEventMask.Click,
  );
  setPointerEvents(target.entity, PointerEventMask.Wheel);
  expect(query({ events: PointerEvents }).map(row => row.events.mask)).toContain(PointerEventMask.Wheel);
  setPointerEvents(target, 0);
  expect(has(target.entity, PointerEvents)).toBe(false);
});

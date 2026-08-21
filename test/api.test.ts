import { expect, test } from "bun:test";
import { entity } from "../index.ts";

test("creates entities from the global ECS", () => {
  const first = entity();
  const second = entity();

  expect(typeof first.entity).toBe("bigint");
  expect(typeof second.entity).toBe("bigint");
  expect(second.entity).not.toBe(first.entity);
});

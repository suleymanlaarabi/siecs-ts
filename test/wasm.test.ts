import { expect, test } from "bun:test";
import createSiecsModule from "../wasm/siecs.mjs";

test("retains all SIECS exports without a manual list", async () => {
  const module = await createSiecsModule();
  const exports = Object.keys(module).filter((name) => name.startsWith("_ecs_"));

  expect(exports.length).toBeGreaterThan(180);
  expect(typeof module._ecs_init).toBe("function");
  expect(typeof module._ecs_progress).toBe("function");
  expect(typeof module._ecs_query_init).toBe("function");
  expect(typeof module._ecs_system_init).toBe("function");
  expect(typeof module._ecs_resource_init).toBe("function");
  expect(typeof module._ecs_iter_next).toBe("function");
  expect(typeof module._siecs_ts_query_init).toBe("function");
  expect(typeof module._siecs_ts_query_iter).toBe("function");
  expect(typeof module._siecs_ts_ensure_cid).toBe("function");
});

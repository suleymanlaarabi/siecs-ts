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
  expect(typeof module._ecs_modified_cid).toBe("function");
  expect(typeof module._ecs_set_cid).toBe("function");
  expect(typeof module._ecs_kill).toBe("function");
  expect(typeof module._ecs_defer_begin).toBe("function");
  expect(typeof module._ecs_relate_id).toBe("function");
  expect(typeof module._ecs_iter_next).toBe("function");
  expect(typeof module._siecs_ts_query_init).toBe("function");
  expect(typeof module._siecs_ts_query_iter).toBe("function");
  expect(typeof module._siecs_ts_ensure_cid).toBe("function");
  expect(typeof module._siecs_ts_resource_init).toBe("function");
  expect(typeof module._siecs_ts_system_init).toBe("function");
  expect(typeof module._siecs_ts_observer_init).toBe("function");
  expect(typeof module.addFunction).toBe("function");
  expect(typeof module.stackSave).toBe("function");
  expect(typeof module.stackAlloc).toBe("function");
  expect(typeof module.stackRestore).toBe("function");
});

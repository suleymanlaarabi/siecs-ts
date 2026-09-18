import { wasm } from "./runtime.js";

export const deferBegin = wasm._ecs_defer_begin as () => void;
export const deferEnd = wasm._ecs_defer_end as () => void;

/** Runs synchronous mutations as one SIECS deferred transaction. */
export function defer<T>(fn: () => T): T {
  deferBegin();
  try {
    return fn();
  } finally {
    deferEnd();
  }
}

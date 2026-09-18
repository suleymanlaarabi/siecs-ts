import { native } from "./runtime.js";

export const deferBegin = native.ecs_defer_begin as () => void;
export const deferEnd = native.ecs_defer_end as () => void;

/** Runs synchronous mutations as one SIECS deferred transaction. */
export function defer<T>(fn: () => T): T {
  deferBegin();
  try {
    return fn();
  } finally {
    deferEnd();
  }
}

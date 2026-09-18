import type { Component } from "./component.js";
import type { Relation } from "./relation.js";
import { wasm } from "./runtime.js";

export const Name = wasm._siecs_ts_builtin_name() as Component<
  { readonly value: string },
  "set-only"
>;
export const Disabled = wasm._siecs_ts_builtin_disabled() as Component<
  Record<never, never>
>;
export const ChildOf = wasm._siecs_ts_builtin_childof() as Relation;

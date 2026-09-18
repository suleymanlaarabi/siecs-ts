import type { Component } from "./component.js";
import type { Relation } from "./relation.js";
import { native } from "./runtime.js";

export const Name = native.siecs_ts_builtin_name() as Component<
  { readonly value: string },
  "set-only"
>;
export const Disabled = native.siecs_ts_builtin_disabled() as Component<
  Record<never, never>
>;
export const ChildOf = native.siecs_ts_builtin_childof() as Relation;

export const Abstract = native.siecs_ts_builtin_abstract() as Component<Record<never, never>>;
export const IsA = native.siecs_ts_builtin_isa() as Relation;

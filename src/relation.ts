import { wasm } from "./runtime.js";

declare const relationBrand: unique symbol;

export type Relation = number & {
  readonly [relationBrand]: true;
};

export function relate(
  entity: bigint,
  relation: Relation,
  target: bigint,
): void {
  wasm._ecs_relate_id(entity, relation, target);
}

export function unrelate(entity: bigint, relation: Relation): void {
  wasm._ecs_unrelate_id(entity, relation);
}

export function target(entity: bigint, relation: Relation): bigint {
  return wasm._ecs_target_id(entity, relation);
}

export function hasRelation(entity: bigint, relation: Relation): boolean {
  return wasm._ecs_has_relation_id(entity, relation) !== 0;
}

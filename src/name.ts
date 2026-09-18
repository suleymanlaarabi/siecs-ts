import { Name } from "./builtins.js";
import { registerSetOnlyComponentSetter } from "./set.js";
import { native } from "./runtime.js";

export function setName(entity: bigint, value: string): void {
  native.siecs_ts_set_name(entity, value);
}
export function getName(entity: bigint): string {
  return native.ecs_entity_name(entity) ?? "";
}
registerSetOnlyComponentSetter(Name, (entity, value) => {
  setName(entity, (value as { value: string }).value);
});

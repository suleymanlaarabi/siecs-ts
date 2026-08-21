export { array, component } from "./src/component.js";
export type {
  Component,
  ComponentData,
  ComponentField,
  ComponentSchema,
  ComponentValue,
  FixedArray,
  ReflectedArray,
  SireflectTypes,
} from "./src/component.js";
export { add, entity, Entity, has, remove, set } from "./src/entity.js";
export { filter, without, write } from "./src/access.js";
export type {
  AccessDescriptor,
  AccessRow,
  AccessTarget,
  DeepReadonly,
  Filter,
  ObserverRow,
  SystemContext,
  Without,
  Write,
} from "./src/access.js";
export { query } from "./src/query.js";
export type { Query, QueryRow } from "./src/query.js";
export { getResource, resource, setResource } from "./src/resource.js";
export type { Resource, ResourceValue } from "./src/resource.js";
export {
  disableSystem,
  enableSystem,
  OnLoad,
  OnRender,
  OnUpdate,
  phase,
  PostLoad,
  PostRender,
  PostStart,
  PostUpdate,
  PreRender,
  PreStart,
  PreUpdate,
  progress,
  run,
  runPhase,
  runSystem,
  Start,
  system,
} from "./src/system.js";
export type {
  Phase,
  PhaseOptions,
  System,
  SystemOptions,
} from "./src/system.js";
export {
  disableObserver,
  emit,
  enableObserver,
  event,
  observer,
  OnAdd,
  OnRelationRemove,
  OnRelationSet,
  OnRemove,
  OnSet,
} from "./src/observer.js";
export type {
  Event,
  Observer,
  RelationEvent,
} from "./src/observer.js";

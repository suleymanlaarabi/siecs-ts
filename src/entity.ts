import type { Component, ComponentValue } from "./component.js";
import { wasm } from "./runtime.js";
import { componentSetters, setComponent } from "./set.js";

export const add = wasm._ecs_add_cid as (
  entity: bigint,
  component: Component,
) => void;

export const has = (entity: bigint, component: Component) =>
  wasm._ecs_has_cid(entity, component) !== 0;

export const remove = wasm._ecs_remove_cid as (
  entity: bigint,
  component: Component,
) => void;

export function set<ComponentType extends Component>(
  entity: bigint,
  component: ComponentType,
  value: ComponentValue<ComponentType>,
) {
  setComponent(entity, component, value);
}

export class Entity {
  entity: bigint;

  constructor(entity: bigint) {
    this.entity = entity;
  }

  add(component: Component): Entity {
    add(this.entity, component);
    return this;
  }

  has(component: Component): boolean {
    return has(this.entity, component);
  }

  remove(component: Component): Entity {
    remove(this.entity, component);
    return this;
  }

  set<ComponentType extends Component>(
    component: ComponentType,
    value: ComponentValue<ComponentType>,
  ): Entity {
    componentSetters[component]!(this.entity, value);
    return this;
  }
}

export const entity = () => new Entity(wasm._ecs_new());

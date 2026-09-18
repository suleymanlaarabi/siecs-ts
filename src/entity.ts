import type { Component, ComponentMutation, ComponentValue } from "./component.js";
import { native } from "./runtime.js";
import type { Relation } from "./relation.js";
import {
  hasRelation,
  relate,
  target,
  unrelate,
} from "./relation.js";
import { getName, setName } from "./name.js";
import { componentSetters, setComponent } from "./set.js";

export const add = native.ecs_add_cid as (
  entity: bigint,
  component: Component<unknown, ComponentMutation>,
) => void;

export const has = (entity: bigint, component: Component<unknown, ComponentMutation>) =>
  native.ecs_has_cid(entity, component);

export const remove = native.ecs_remove_cid as (
  entity: bigint,
  component: Component<unknown, ComponentMutation>,
) => void;

export const kill = native.ecs_kill as (entity: bigint) => void;

export const createEntity = native.ecs_new as () => bigint;

export function isAlive(entity: bigint): boolean {
  return entity !== 0n && native.ecs_is_alive(entity);
}

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

  add(...components: Component<unknown, ComponentMutation>[]): Entity {
    components.forEach((cid) => add(this.entity, cid));
    return this;
  }

  has(component: Component<unknown, ComponentMutation>): boolean {
    return has(this.entity, component);
  }

  remove(...components: Component<unknown, ComponentMutation>[]): Entity {
    components.forEach((cid) => remove(this.entity, cid));
    return this;
  }

  kill(): void {
    kill(this.entity);
  }

  isAlive(): boolean {
    return isAlive(this.entity);
  }

  relate(relation: Relation, targetEntity: Entity | bigint): this {
    relate(
      this.entity,
      relation,
      typeof targetEntity === "bigint" ? targetEntity : targetEntity.entity,
    );
    return this;
  }

  unrelate(relation: Relation): this {
    unrelate(this.entity, relation);
    return this;
  }

  target(relation: Relation): bigint {
    return target(this.entity, relation);
  }

  hasRelation(relation: Relation): boolean {
    return hasRelation(this.entity, relation);
  }

  setName(value: string): this {
    setName(this.entity, value);
    return this;
  }

  getName(): string {
    return getName(this.entity);
  }

  set<ComponentType extends Component<unknown, ComponentMutation>>(
    component: ComponentType,
    value: ComponentValue<ComponentType>,
  ): Entity {
    componentSetters[component]!(this.entity, value);
    return this;
  }
}

export const entity = (...components: Component<unknown, ComponentMutation>[]) => {
  const e = new Entity(createEntity());
  e.add(...components);
  return e;
};

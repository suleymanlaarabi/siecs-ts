import {
  type AccessDescriptor,
  type ObserverRow,
  allocateTerms,
  compileAccess,
  refreshObserverRow,
} from "./access.js";
import { Entity } from "./entity.js";
import { wasm } from "./runtime.js";
import { setOnSetNotifications } from "./set.js";

declare const eventBrand: unique symbol;
declare const observerBrand: unique symbol;

export interface Event<Payload = void> {
  readonly [eventBrand]: Payload;
}

export interface RelationEvent {
  readonly relation: number;
  readonly oldTarget: bigint;
  readonly newTarget: bigint;
}

export interface Observer {
  readonly [observerBrand]: true;
}

interface ObserverHandle extends Observer {
  readonly id: number;
  readonly event: number;
  enabled: boolean;
}

type PayloadOf<EventType extends Event<unknown>> =
  EventType extends Event<infer Payload> ? Payload : never;

export const OnAdd = 0 as unknown as Event<void>;
export const OnRemove = 1 as unknown as Event<void>;
export const OnSet = 2 as unknown as Event<void>;
export const OnRelationSet = 3 as unknown as Event<RelationEvent>;
export const OnRelationRemove = 4 as unknown as Event<RelationEvent>;

const payloadStacks = new Map<number, unknown[]>();
let activeOnSetObservers = 0;

function eventId(event: Event<unknown>): number {
  return event as unknown as number;
}

function observerHandle(observer: Observer): ObserverHandle {
  return observer as ObserverHandle;
}

function updateOnSetObservers(delta: number) {
  activeOnSetObservers += delta;
  if (activeOnSetObservers === 0 || activeOnSetObservers === 1 && delta > 0) {
    setOnSetNotifications(activeOnSetObservers !== 0);
  }
}

export function event<Payload = void>(): Event<Payload> {
  return wasm._ecs_event() as unknown as Event<Payload>;
}

export function observer<
  const EventType extends Event<unknown>,
  const Descriptor extends AccessDescriptor,
>(
  observedEvent: EventType,
  descriptor: Descriptor & { readonly entity?: never },
  callback: (
    row: ObserverRow<Descriptor>,
    payload: PayloadOf<EventType>,
  ) => void,
): Observer {
  const idOfEvent = eventId(observedEvent);
  const plan = compileAccess(descriptor, true);
  const relationPayload: { relation: number; oldTarget: bigint; newTarget: bigint } = {
    relation: 0,
    oldTarget: 0n,
    newTarget: 0n,
  };
  const nativeCallback = (eventPointer: number) => {
    const entity = wasm.HEAPU64[eventPointer >> 3]!;
    refreshObserverRow(plan, entity);

    let payload: unknown;
    if (idOfEvent === 3 || idOfEvent === 4) {
      const trigger = wasm.HEAPU32[(eventPointer + 16) >> 2]!;
      relationPayload.relation = wasm.HEAPU16[trigger >> 1]!;
      relationPayload.oldTarget = wasm.HEAPU64[(trigger + 8) >> 3]!;
      relationPayload.newTarget = wasm.HEAPU64[(trigger + 16) >> 3]!;
      payload = relationPayload;
    } else if (idOfEvent > 4) {
      const stack = payloadStacks.get(idOfEvent);
      payload = stack?.[stack.length - 1];
    }
    callback(
      plan.row as ObserverRow<Descriptor>,
      payload as PayloadOf<EventType>,
    );
  };
  const callbackPointer = wasm.addFunction(nativeCallback, "vi");
  const components = allocateTerms(plan.componentTerms);
  const id = wasm._siecs_ts_observer_init(
    idOfEvent,
    components,
    plan.componentTerms.length,
    callbackPointer,
  );
  if (components) wasm._free(components);
  if (idOfEvent === 2) updateOnSetObservers(1);
  return { id, event: idOfEvent, enabled: true } as ObserverHandle;
}

export function emit<EventType extends Event<unknown>>(
  entity: Entity | bigint,
  emittedEvent: EventType,
  ...args: PayloadOf<EventType> extends void ? [] : [PayloadOf<EventType>]
): void {
  const id = eventId(emittedEvent);
  const payload = args[0];
  let stack = payloadStacks.get(id);
  if (!stack) {
    stack = [];
    payloadStacks.set(id, stack);
  }
  stack.push(payload);
  try {
    wasm._ecs_observer_trigger(
      typeof entity === "bigint" ? entity : entity.entity,
      id,
      0,
    );
  } finally {
    stack.pop();
  }
}

export function enableObserver(observer: Observer): void {
  const value = observerHandle(observer);
  if (value.enabled) return;
  value.enabled = true;
  wasm._ecs_observer_enable(value.id);
  if (value.event === 2) updateOnSetObservers(1);
}

export function disableObserver(observer: Observer): void {
  const value = observerHandle(observer);
  if (!value.enabled) return;
  value.enabled = false;
  wasm._ecs_observer_disable(value.id);
  if (value.event === 2) updateOnSetObservers(-1);
}

import {
  type AccessDescriptor,
  type ObserverRow,
  allocateTerms,
  compileAccess,
  refreshObserverRow,
} from "./access.js";
import { Entity } from "./entity.js";
import { abi, native, read, registerCallback } from "./runtime.js";

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
type NativeEventDecoder = (triggerData: number) => unknown;
const nativeEventDecoders = new Map<number, () => NativeEventDecoder>();

/** Internal bridge for native event payloads borrowed from SIECS callbacks. */
export function registerNativeEventDecoder(
  observedEvent: Event<unknown>,
  createDecoder: () => NativeEventDecoder,
): void {
  nativeEventDecoders.set(eventId(observedEvent), createDecoder);
}

function eventId(event: Event<unknown>): number {
  return event as unknown as number;
}

function observerHandle(observer: Observer): ObserverHandle {
  return observer as ObserverHandle;
}

export function event<Payload = void>(): Event<Payload> {
  return native.ecs_event() as unknown as Event<Payload>;
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
  const nativeDecoder = nativeEventDecoders.get(idOfEvent)?.();
  const nativeCallback = (eventPointer: number) => {
    const entity = read.u64(eventPointer, abi.eventEntity);
    refreshObserverRow(plan, entity);

    let payload: unknown;
    if (idOfEvent === 3 || idOfEvent === 4) {
      const trigger = read.ptr(eventPointer, abi.eventTrigger);
      relationPayload.relation = read.u16(trigger, abi.relation);
      relationPayload.oldTarget = read.u64(trigger, abi.oldTarget);
      relationPayload.newTarget = read.u64(trigger, abi.newTarget);
      payload = relationPayload;
    } else if (nativeDecoder) {
      payload = nativeDecoder(read.ptr(eventPointer, abi.eventTrigger));
    } else if (idOfEvent > 4) {
      const stack = payloadStacks.get(idOfEvent);
      payload = stack?.[stack.length - 1];
    }
    callback(
      plan.row as ObserverRow<Descriptor>,
      payload as PayloadOf<EventType>,
    );
  };
  const callbackPointer = registerCallback(nativeCallback);
  const components = allocateTerms(plan.componentTerms);
  const id = native.siecs_ts_observer_init(
    idOfEvent,
    components,
    plan.componentTerms.length,
    callbackPointer,
  );
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
    native.ecs_observer_trigger(
      typeof entity === "bigint" ? entity : entity.entity,
      id,
      null,
    );
  } finally {
    stack.pop();
  }
}

export function enableObserver(observer: Observer): void {
  const value = observerHandle(observer);
  if (value.enabled) return;
  value.enabled = true;
  native.ecs_observer_enable(value.id);
}

export function disableObserver(observer: Observer): void {
  const value = observerHandle(observer);
  if (!value.enabled) return;
  value.enabled = false;
  native.ecs_observer_disable(value.id);
}

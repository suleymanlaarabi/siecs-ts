import {
  type AccessDescriptor,
  type AccessRow,
  type SystemContext,
  allocateTerms,
  compileAccess,
  compileSystemBatch,
} from "./access.js";
import { abi, fini as closeRuntime, native, registerCallback } from "./runtime.js";

declare const phaseBrand: unique symbol;
declare const systemBrand: unique symbol;

export type Phase = number & { readonly [phaseBrand]: true };
export interface System {
  readonly [systemBrand]: true;
}

interface SystemHandle extends System {
  readonly id: number;
}

export interface PhaseOptions {
  readonly after?: Phase;
  readonly before?: Phase;
}

export interface SystemOptions {
  readonly phase?: Phase;
  readonly after?: readonly System[];
  readonly disabled?: boolean;
}

export const PreStart = 0 as Phase;
export const Start = 1 as Phase;
export const PostStart = 2 as Phase;
export const OnLoad = 3 as Phase;
export const PostLoad = 4 as Phase;
export const PreUpdate = 5 as Phase;
export const OnUpdate = 6 as Phase;
export const PostUpdate = 7 as Phase;
export const PreRender = 8 as Phase;
export const OnRender = 9 as Phase;
export const PostRender = 10 as Phase;

const NoPhase = 0xffffffff as Phase;

function systemId(system: System): number {
  return (system as SystemHandle).id;
}

export function phase(name: string, options: PhaseOptions = {}): Phase {
  const id = native.siecs_ts_phase_init(
    name,
    options.after ?? NoPhase,
    options.before ?? NoPhase,
  );
  return id as Phase;
}

type SystemDesc = {};

export function system<const Descriptor extends AccessDescriptor>({
  name = "Unknown",
  query = {} as Descriptor,
  each,
  options = {},
}: {
  name?: string;
  query?: Descriptor & { readonly entity?: never };
  each: (row: AccessRow<Descriptor>, context: SystemContext) => void;
  options?: SystemOptions;
}): System {
  const plan = compileAccess(query);
  const dependencies = options.after ?? [];
  if (dependencies.length > abi.afterCapacity) {
    throw new RangeError(`Native systems support at most ${abi.afterCapacity} dependencies`);
  }
  const context = { deltaTime: 0 };
  const batch = compileSystemBatch(
    plan,
    context,
    each as (row: never, context: SystemContext) => void,
  );
  const callbackPointer = registerCallback(batch);
  const components = allocateTerms(plan.componentTerms);
  const resources = allocateTerms(plan.resourceTerms);
  const after = dependencies.length ? new Uint16Array(dependencies.map(systemId)) : null;

  const id = native.siecs_ts_system_init(
    name,
    components,
    plan.componentTerms.length,
    resources,
    plan.resourceTerms.length,
    options.phase ?? OnUpdate,
    after,
    dependencies.length,
    callbackPointer,
    options.disabled ?? false,
  );
  return { id } as SystemHandle;
}

export function runSystem(system: System): void {
  native.ecs_run_system(systemId(system));
}

export function runPhase(phase: Phase): void {
  native.ecs_run_phase(phase);
}

export function run(): void {
  try {
    native.siecs_ts_run();
  } finally {
    closeRuntime();
  }
}

export function progress(): boolean {
  return native.ecs_progress();
}

export function quit(): void {
  native.ecs_quit();
}

export function fini(): void {
  closeRuntime();
}

export function enableSystem(system: System): void {
  native.ecs_system_enable(systemId(system));
}

export function disableSystem(system: System): void {
  native.ecs_system_disable(systemId(system));
}

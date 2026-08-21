import {
  type AccessDescriptor,
  type AccessRow,
  type SystemContext,
  allocateTerms,
  compileAccess,
  compileSystemBatch,
} from "./access.js";
import { allocateString, wasm } from "./runtime.js";

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
  const namePointer = allocateString(name);
  const id = wasm._siecs_ts_phase_init(
    namePointer,
    options.after ?? NoPhase,
    options.before ?? NoPhase,
  );
  wasm._free(namePointer);
  return id as Phase;
}

export function system<const Descriptor extends AccessDescriptor>(
  name: string,
  descriptor: Descriptor & { readonly entity?: never },
  callback: (
    row: AccessRow<Descriptor>,
    context: SystemContext,
  ) => void,
  options: SystemOptions = {},
): System {
  const plan = compileAccess(descriptor);
  const context = { deltaTime: 0 };
  const batch = compileSystemBatch(
    plan,
    context,
    callback as (row: never, context: SystemContext) => void,
  );
  const callbackPointer = wasm.addFunction(batch, "vi");
  const namePointer = allocateString(name);
  const components = allocateTerms(plan.componentTerms);
  const resources = allocateTerms(plan.resourceTerms);
  const dependencies = options.after ?? [];
  const afterPointer = dependencies.length
    ? wasm._malloc(dependencies.length * 2)
    : 0;
  for (let index = 0; index < dependencies.length; index++) {
    wasm.HEAPU16[(afterPointer >> 1) + index] = systemId(dependencies[index]!);
  }

  const id = wasm._siecs_ts_system_init(
    namePointer,
    components,
    plan.componentTerms.length,
    resources,
    plan.resourceTerms.length,
    options.phase ?? OnUpdate,
    afterPointer,
    dependencies.length,
    callbackPointer,
    options.disabled ?? false,
  );
  if (afterPointer) wasm._free(afterPointer);
  if (resources) wasm._free(resources);
  if (components) wasm._free(components);
  wasm._free(namePointer);
  return { id } as SystemHandle;
}

export function runSystem(system: System): void {
  wasm._ecs_run_system(systemId(system));
}

export function runPhase(phase: Phase): void {
  wasm._ecs_run_phase(phase);
}

export function run(): void {
  wasm._ecs_run();
}

export function progress(): boolean {
  return wasm._ecs_progress() !== 0;
}

export function enableSystem(system: System): void {
  wasm._ecs_system_enable(systemId(system));
}

export function disableSystem(system: System): void {
  wasm._ecs_system_disable(systemId(system));
}

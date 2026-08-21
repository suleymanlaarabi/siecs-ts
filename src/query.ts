import {
  type AccessDescriptor,
  type AccessRow,
  allocateTerms,
  compileAccess,
  compileQueryEach,
} from "./access.js";
import { wasm } from "./runtime.js";

export type QueryRow<Descriptor extends AccessDescriptor> =
  AccessRow<Descriptor>;

export interface Query<Row> {
  each(callback: (row: Row) => void): void;
}

export function query<const Descriptor extends AccessDescriptor>(
  descriptor: Descriptor & { readonly entity?: never },
): Query<QueryRow<Descriptor>> {
  const plan = compileAccess(descriptor);
  const components = allocateTerms(plan.componentTerms);
  const resources = allocateTerms(plan.resourceTerms);
  const id = wasm._siecs_ts_query_init(
    components,
    plan.componentTerms.length,
    resources,
    plan.resourceTerms.length,
  );
  if (components) wasm._free(components);
  if (resources) wasm._free(resources);

  const iter = wasm._malloc(32);
  const each = compileQueryEach(id, iter, plan);
  return { each } as Query<QueryRow<Descriptor>>;
}

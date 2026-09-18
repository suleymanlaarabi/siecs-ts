import {
  type AccessDescriptor,
  type AccessRow,
  allocateTerms,
  compileAccess,
  compileQueryEach,
} from "./access.js";
import { abi, native } from "./runtime.js";

export type QueryRow<Descriptor extends AccessDescriptor> =
  AccessRow<Descriptor>;

export interface Query<Row> {
  each(callback: (row: Row) => void): void;
  map<T>(callback: (row: Row) => T): T[];
}

export function query<const Descriptor extends AccessDescriptor>(
  descriptor: Descriptor & { readonly entity?: never },
): Query<QueryRow<Descriptor>> {
  const plan = compileAccess(descriptor);
  const components = allocateTerms(plan.componentTerms);
  const resources = allocateTerms(plan.resourceTerms);
  const id = native.siecs_ts_query_init(
    components,
    plan.componentTerms.length,
    resources,
    plan.resourceTerms.length,
  );
  const iter = new Uint8Array(abi.iterSize);
  const each = compileQueryEach(id, iter, plan);

  function map<T>(fn: (_: QueryRow<Descriptor>) => T) {
    const result: T[] = [];
    each((row) => result.push(fn(row)));
    return result;
  }

  return { each, map } as Query<QueryRow<Descriptor>>;
}

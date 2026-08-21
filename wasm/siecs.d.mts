export interface SiecsModule {
  _ecs_init(): void;
  _ecs_fini(): void;
  _ecs_new(): bigint;
  _ecs_add_cid(entity: bigint, component: number): void;
  _ecs_has_cid(entity: bigint, component: number): number;
  _ecs_remove_cid(entity: bigint, component: number): void;
  _ecs_iter_next(iter: number): number;
  _siecs_ts_component_init(name: number, fields: number): number;
  _siecs_ts_ensure_cid(entity: bigint, component: number): number;
  _siecs_ts_component_type(component: number): bigint;
  _siecs_ts_type_kind(type: bigint): number;
  _siecs_ts_type_size(type: bigint): number;
  _siecs_ts_type_field_count(type: bigint): number;
  _siecs_ts_type_field_name(type: bigint, index: number): number;
  _siecs_ts_type_field_type(type: bigint, index: number): bigint;
  _siecs_ts_type_field_offset(type: bigint, index: number): number;
  _siecs_ts_type_element(type: bigint): bigint;
  _siecs_ts_type_element_count(type: bigint): number;
  _siecs_ts_query_init(terms: number, count: number): number;
  _siecs_ts_query_iter(query: number, iter: number): void;
  _siecs_ts_bench_i32(query: number, fieldCount: number): void;
  _malloc(size: number): number;
  _free(pointer: number): void;
  HEAPU8: Uint8Array;
  HEAP8: Int8Array;
  HEAPU16: Uint16Array;
  HEAP16: Int16Array;
  HEAPU32: Uint32Array;
  HEAP32: Int32Array;
  HEAPU64: BigUint64Array;
  HEAP64: BigInt64Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  UTF8ToString(pointer: number): string;
  [name: `_ecs_${string}`]: unknown;
}

export default function createSiecsModule(): Promise<SiecsModule>;

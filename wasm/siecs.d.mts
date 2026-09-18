export interface SiecsModule {
  _ecs_init(): void;
  _ecs_fini(): void;
  _ecs_new(): bigint;
  _ecs_kill(entity: bigint): void;
  _ecs_is_alive(entity: bigint): number;
  _ecs_defer_begin(): void;
  _ecs_defer_end(): void;
  _ecs_add_cid(entity: bigint, component: number): void;
  _ecs_has_cid(entity: bigint, component: number): number;
  _ecs_remove_cid(entity: bigint, component: number): void;
  _ecs_get_cid(entity: bigint, component: number): number;
  _ecs_modified_cid(entity: bigint, component: number): void;
  _ecs_set_cid(entity: bigint, component: number, value: number): void;
  _ecs_relate_id(entity: bigint, relation: number, target: bigint): void;
  _ecs_unrelate_id(entity: bigint, relation: number): void;
  _ecs_target_id(entity: bigint, relation: number): bigint;
  _ecs_has_relation_id(entity: bigint, relation: number): number;
  _ecs_entity_name(entity: bigint): number;
  _ecs_resource_rid(resource: number): number;
  _ecs_event(): number;
  _ecs_observer_trigger(entity: bigint, event: number, data: number): void;
  _ecs_observer_enable(observer: number): void;
  _ecs_observer_disable(observer: number): void;
  _ecs_system_enable(system: number): void;
  _ecs_system_disable(system: number): void;
  _ecs_run_system(system: number): void;
  _ecs_run_phase(phase: number): void;
  _ecs_run(): void;
  _ecs_progress(): number;
  _ecs_iter_next(iter: number): number;
  _siecs_ts_component_init(name: number, fields: number): number;
  _siecs_ts_builtin_name(): number;
  _siecs_ts_builtin_disabled(): number;
  _siecs_ts_builtin_childof(): number;
  _siecs_ts_set_name(entity: bigint, value: number): void;
  _siecs_ts_resource_init(name: number, fields: number, type: number): number;
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
  _siecs_ts_query_init(
    components: number,
    componentCount: number,
    resources: number,
    resourceCount: number,
  ): number;
  _siecs_ts_query_iter(query: number, iter: number): void;
  _siecs_ts_system_init(
    name: number,
    components: number,
    componentCount: number,
    resources: number,
    resourceCount: number,
    phase: number,
    after: number,
    afterCount: number,
    callback: number,
    disabled: boolean,
  ): number;
  _siecs_ts_observer_init(
    event: number,
    components: number,
    componentCount: number,
    callback: number,
  ): number;
  _siecs_ts_phase_init(name: number, after: number, before: number): number;
  _siecs_ts_bench_i32(query: number, fieldCount: number): void;
  _siecs_ts_bench_set_i32(
    entities: number,
    count: number,
    component: number,
    value: number,
  ): void;
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
  addFunction(callback: (...args: never[]) => unknown, signature: string): number;
  stackSave(): number;
  stackAlloc(size: number): number;
  stackRestore(pointer: number): void;
  [name: `_ecs_${string}`]: unknown;
}

export default function createSiecsModule(): Promise<SiecsModule>;

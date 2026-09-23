import { dlopen, JSCallback, read, toArrayBuffer, suffix, type Pointer } from "bun:ffi";
import { join } from "node:path";

const directory = import.meta.dir;
const assets = directory.endsWith("/src") ? join(directory, "../native") : join(directory, "native");
const library = dlopen(join(assets, `libsiecs_ts.${suffix}`), {
  ecs_init: { args: [], returns: "void" },
  ecs_fini: { args: [], returns: "void" },
  ecs_quit: { args: [], returns: "void" },
  ecs_new: { args: [], returns: "u64" },
  ecs_kill: { args: ["u64"], returns: "void" },
  ecs_is_alive: { args: ["u64"], returns: "bool" },
  ecs_defer_begin: { args: [], returns: "void" },
  ecs_defer_end: { args: [], returns: "void" },
  ecs_add_cid: { args: ["u64","u16"], returns: "void" },
  ecs_has_cid: { args: ["u64","u16"], returns: "bool" },
  ecs_remove_cid: { args: ["u64","u16"], returns: "void" },
  ecs_get_cid: { args: ["u64","u16"], returns: "ptr" },
  ecs_modified_cid: { args: ["u64","u16"], returns: "void" },
  ecs_set_cid: { args: ["u64","u16","ptr"], returns: "void" },
  ecs_relate_id: { args: ["u64","u16","u64"], returns: "void" },
  ecs_unrelate_id: { args: ["u64","u16"], returns: "void" },
  ecs_target_id: { args: ["u64","u16"], returns: "u64" },
  ecs_has_relation_id: { args: ["u64","u16"], returns: "bool" },
  ecs_entity_name: { args: ["u64"], returns: "cstring" },
  ecs_resource_rid: { args: ["u16"], returns: "ptr" },
  ecs_resource_find: { args: ["cstring"], returns: "u16" },
  ecs_set_resource_rid: { args: ["u16","ptr"], returns: "void" },
  ecs_event: { args: [], returns: "u16" },
  ecs_observer_trigger: { args: ["u64","u16","ptr"], returns: "void" },
  ecs_observer_enable: { args: ["u16"], returns: "void" },
  ecs_observer_disable: { args: ["u16"], returns: "void" },
  ecs_system_enable: { args: ["u16"], returns: "void" },
  ecs_system_disable: { args: ["u16"], returns: "void" },
  ecs_run_system: { args: ["u16"], returns: "void" },
  ecs_run_phase: { args: ["u32"], returns: "void" },
  siecs_ts_run: { args: [], returns: "void" },
  ecs_progress: { args: [], returns: "bool" },
  ecs_iter_next: { args: ["ptr"], returns: "bool" },
  siecs_ts_abi: { args: [], returns: "ptr" },
  siecs_ts_alloc: { args: ["u64"], returns: "ptr" },
  siecs_ts_free: { args: ["ptr"], returns: "void" },
  siecs_ts_component_init: { args: ["cstring","cstring"], returns: "u16" },
  siecs_ts_set_name: { args: ["u64","cstring"], returns: "void" },
  siecs_ts_resource_init: { args: ["cstring","cstring","ptr"], returns: "u16" },
  siecs_ts_ensure_cid: { args: ["u64","u16"], returns: "ptr" },
  siecs_ts_component_type: { args: ["u16"], returns: "u64" },
  siecs_ts_type_kind: { args: ["u64"], returns: "u32" },
  siecs_ts_type_size: { args: ["u64"], returns: "u32" },
  siecs_ts_type_field_count: { args: ["u64"], returns: "u32" },
  siecs_ts_type_field_name: { args: ["u64","u32"], returns: "cstring" },
  siecs_ts_type_field_offset: { args: ["u64","u32"], returns: "u32" },
  siecs_ts_type_field_type: { args: ["u64","u32"], returns: "u64" },
  siecs_ts_type_element: { args: ["u64"], returns: "u64" },
  siecs_ts_type_element_count: { args: ["u64"], returns: "u32" },
  siecs_ts_query_init: { args: ["ptr","u32","ptr","u32"], returns: "u16" },
  siecs_ts_query_iter: { args: ["u16","ptr"], returns: "void" },
  siecs_ts_system_init: { args: ["cstring","ptr","u32","ptr","u32","u32","ptr","u32","ptr","bool"], returns: "u16" },
  siecs_ts_observer_init: { args: ["u16","ptr","u32","ptr"], returns: "u16" },
  siecs_ts_phase_init: { args: ["cstring","u32","u32"], returns: "u32" },
  siecs_ts_bench_i32: { args: ["u16","u32"], returns: "void" },
  siecs_ts_bench_set_i32: { args: ["ptr","u32","u16","i32"], returns: "void" },
  siecs_ts_rendering_init: { args: ["cstring"], returns: "void" },
  siecs_ts_rendering_component_id: { args: ["cstring"], returns: "u16" },
  siecs_ts_rendering_resource_id: { args: ["cstring"], returns: "u16" },
  siecs_ts_rendering_resource_type: { args: ["cstring"], returns: "u64" },
  siecs_ts_input_resource_id: { args: ["cstring"], returns: "u16" },
  siecs_ts_input_resource_type: { args: ["cstring"], returns: "u64" },
  siecs_ts_interaction_component_id: { args: ["cstring"], returns: "u16" },
  siecs_ts_pointer_event_id: { args: ["u32"], returns: "u16" },
  siecs_ts_pointer_event_abi: { args: [], returns: "ptr" },
  siecs_ts_builtin_name: { args: [], returns: "u16" },
  siecs_ts_builtin_disabled: { args: [], returns: "u16" },
  siecs_ts_builtin_childof: { args: [], returns: "u16" },
  siecs_ts_builtin_isa: { args: [], returns: "u16" },
  siecs_ts_builtin_abstract: { args: [], returns: "u16" },
  siecs_ts_write_u8: { args: ["ptr","u8"], returns: "void" },
  siecs_ts_write_u16: { args: ["ptr","u16"], returns: "void" },
  siecs_ts_write_u32: { args: ["ptr","u32"], returns: "void" },
  siecs_ts_write_u64: { args: ["ptr","u64"], returns: "void" },
  siecs_ts_write_i8: { args: ["ptr","i8"], returns: "void" },
  siecs_ts_write_i16: { args: ["ptr","i16"], returns: "void" },
  siecs_ts_write_i32: { args: ["ptr","i32"], returns: "void" },
  siecs_ts_write_i64: { args: ["ptr","i64"], returns: "void" },
  siecs_ts_write_f32: { args: ["ptr","f32"], returns: "void" },
  siecs_ts_write_f64: { args: ["ptr","f64"], returns: "void" },
  siecs_ts_write_ptr: { args: ["ptr","ptr"], returns: "void" },
} as const);
// SIECS invariants guarantee valid storage for registered, required fields.
type NativeReturn<Result> = [Result] extends [bigint] ? bigint : [Result] extends [string | null] ? string : [Result] extends [undefined] ? undefined : [Result] extends [boolean] ? boolean : number;
export const native = library.symbols as unknown as {
  [Key in keyof typeof library.symbols]: (...args: Parameters<(typeof library.symbols)[Key]>) => NativeReturn<ReturnType<(typeof library.symbols)[Key]>>;
};
export { read };

const layout = new Uint32Array(toArrayBuffer(native.siecs_ts_abi(), 0, 15 * 4));
export const abi = {
  pointerSize: layout[0]!, iterSize: layout[1]!,
  count: layout[2]!, entities: layout[3]!, ptrs: layout[4]!,
  deltaTime: layout[5]!, fieldKinds: layout[6]!,
  eventEntity: layout[7]!, eventTrigger: layout[8]!,
  relation: layout[9]!, oldTarget: layout[10]!, newTarget: layout[11]!,
  componentCapacity: layout[12]!, resourceCapacity: layout[13]!, afterCapacity: layout[14]!,
};

const callbacks: JSCallback[] = [];
export function registerCallback(callback: (pointer: number) => void): Pointer {
  const handle = new JSCallback(callback, { args: ["ptr"], returns: "void" });
  callbacks.push(handle);
  return handle.ptr!;
}

let closed = false;
export function fini(): void {
  if (closed) return;
  closed = true;
  native.ecs_fini();
  for (const callback of callbacks) callback.close();
  callbacks.length = 0;
  library.close();
}
export const quit = native.ecs_quit;
native.ecs_init();
native.siecs_ts_rendering_init(join(assets, "rendering/shaders"));
process.once("exit", fini);

#include <sigpu.h>
#include <interaction/interaction.h>

SIECS_PUBLIC_API void siecs_ts_rendering_init(const char *shader_directory) {
    (void)shader_directory;
    sigpu_import(NULL);
}

SIECS_PUBLIC_API uint16_t siecs_ts_rendering_component_id(const char *name) {
    return sigpu_component_id(name);
}

SIECS_PUBLIC_API uint16_t siecs_ts_rendering_resource_id(const char *name) {
    return sigpu_resource_id(name);
}

SIECS_PUBLIC_API sireflect_handle_t siecs_ts_rendering_resource_type(const char *name) {
    return sigpu_resource_type(name);
}

SIECS_PUBLIC_API uint16_t siecs_ts_input_resource_id(const char *name) {
    return sigpu_resource_id(name);
}

SIECS_PUBLIC_API sireflect_handle_t siecs_ts_input_resource_type(const char *name) {
    return sigpu_resource_type(name);
}

SIECS_PUBLIC_API uint16_t siecs_ts_interaction_component_id(const char *name) {
    return sigpu_component_id(name);
}

SIECS_PUBLIC_API void siecs_ts_interaction_init(ecs_system_id_t after) {
    sigpu_interaction_init(after);
}

SIECS_PUBLIC_API ecs_event_t siecs_ts_pointer_event_id(uint32_t kind) {
    return sigpu_pointer_event_id(kind);
}

SIECS_PUBLIC_API const uint32_t *siecs_ts_pointer_event_abi(void) {
    return sigpu_pointer_event_abi();
}

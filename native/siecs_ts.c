#include "../siecs/siecs.h"
#include <stddef.h>
#include <stdlib.h>

_Static_assert(sizeof(void *) == 4, "siecs-ts requires wasm32 pointers");
_Static_assert(offsetof(ecs_iter_t, count) == 0, "unexpected ecs_iter_t.count offset");
_Static_assert(offsetof(ecs_iter_t, entities) == 4, "unexpected ecs_iter_t.entities offset");
_Static_assert(offsetof(ecs_iter_t, ptrs) == 8, "unexpected ecs_iter_t.ptrs offset");
_Static_assert(offsetof(ecs_iter_t, field_kind_bits) == 20,
               "unexpected ecs_iter_t.field_kind_bits offset");
_Static_assert(sizeof(ecs_iter_t) == 32, "unexpected ecs_iter_t size");
_Static_assert(offsetof(ecs_observer_event_t, entity) == 0,
               "unexpected ecs_observer_event_t.entity offset");
_Static_assert(offsetof(ecs_observer_event_t, event) == 8,
               "unexpected ecs_observer_event_t.event offset");
_Static_assert(offsetof(ecs_observer_event_t, trigger_data) == 16,
               "unexpected ecs_observer_event_t.trigger_data offset");
_Static_assert(offsetof(ecs_relation_event_t, relation) == 0,
               "unexpected ecs_relation_event_t.relation offset");
_Static_assert(offsetof(ecs_relation_event_t, old_target) == 8,
               "unexpected ecs_relation_event_t.old_target offset");
_Static_assert(offsetof(ecs_relation_event_t, new_target) == 16,
               "unexpected ecs_relation_event_t.new_target offset");

SIECS_PUBLIC_API ecs_component_t
siecs_ts_component_init(const char *name, const char *fields) {
    return ecs_component_dynamic_init(&(ecs_dynamic_component_desc_t){
        .name = name,
        .fields = fields,
    });
}

SIECS_PUBLIC_API void *
siecs_ts_ensure_cid(ecs_entity_t entity, ecs_component_t component) {
    ecs_add_cid(entity, component);
    return ecs_get_cid(entity, component);
}

SIECS_PUBLIC_API ecs_resource_t siecs_ts_resource_init(
    const char *name,
    const char *fields,
    sireflect_handle_t *type_out
) {
    sireflect_handle_t type = sireflect_try_register_dynamic_struct(name, fields);
    const sireflect_type_info_t *info = sireflect_type_info(type);
    ecs_resource_t resource = ecs_resource_find(name);

    if (!resource) {
        resource = ecs_resource_init(&(ecs_resource_desc_t){
            .name = name,
            .size = info->size,
        });
        void *zero = calloc(1, info->size ? info->size : 1);
        ecs_set_resource_rid(resource, zero);
        free(zero);
    }

    *type_out = type;
    return resource;
}

SIECS_PUBLIC_API sireflect_handle_t
siecs_ts_component_type(ecs_component_t component) {
    return ecs_component_info(component)->type;
}

SIECS_PUBLIC_API uint32_t siecs_ts_type_kind(sireflect_handle_t type) {
    return (uint32_t)sireflect_type_info(type)->kind;
}

SIECS_PUBLIC_API uint32_t siecs_ts_type_size(sireflect_handle_t type) {
    return (uint32_t)sireflect_type_size(type);
}

SIECS_PUBLIC_API uint32_t
siecs_ts_type_field_count(sireflect_handle_t type) {
    return (uint32_t)sireflect_type_fields(type)->field_count;
}

static const sireflect_field_info_t *
siecs_ts_type_field(sireflect_handle_t type, uint32_t index) {
    return &sireflect_type_fields(type)->fields[index];
}

SIECS_PUBLIC_API const char *
siecs_ts_type_field_name(sireflect_handle_t type, uint32_t index) {
    return siecs_ts_type_field(type, index)->name;
}

SIECS_PUBLIC_API sireflect_handle_t
siecs_ts_type_field_type(sireflect_handle_t type, uint32_t index) {
    return siecs_ts_type_field(type, index)->type;
}

SIECS_PUBLIC_API uint32_t
siecs_ts_type_field_offset(sireflect_handle_t type, uint32_t index) {
    return (uint32_t)siecs_ts_type_field(type, index)->offset;
}

SIECS_PUBLIC_API sireflect_handle_t
siecs_ts_type_element(sireflect_handle_t type) {
    return sireflect_type_element(type);
}

SIECS_PUBLIC_API uint32_t
siecs_ts_type_element_count(sireflect_handle_t type) {
    return (uint32_t)sireflect_type_element_count(type);
}

static void siecs_ts_query_terms(
    ecs_query_desc_t *desc,
    const uint32_t *components,
    uint32_t component_count,
    const uint32_t *resources,
    uint32_t resource_count
) {
    for (uint32_t index = 0; index < component_count; index++) {
        desc->components[index] = (ecs_component_term_t){
            .id = (ecs_component_t)(components[index] & 0xffffu),
            .access = components[index] >> 16,
        };
    }

    for (uint32_t index = 0; index < resource_count; index++) {
        desc->resources[index] = (ecs_resource_term_t){
            .id = (ecs_resource_t)(resources[index] & 0xffffu),
            .access = resources[index] >> 16,
        };
    }
}

SIECS_PUBLIC_API ecs_query_id_t siecs_ts_query_init(
    const uint32_t *components,
    uint32_t component_count,
    const uint32_t *resources,
    uint32_t resource_count
) {
    ecs_query_desc_t desc = {0};
    siecs_ts_query_terms(
        &desc, components, component_count, resources, resource_count
    );
    return ecs_query_init(&desc);
}

SIECS_PUBLIC_API void
siecs_ts_query_iter(ecs_query_id_t query, ecs_iter_t *iter) {
    *iter = ecs_query_iter(query);
}

SIECS_PUBLIC_API ecs_system_id_t siecs_ts_system_init(
    const char *name,
    const uint32_t *components,
    uint32_t component_count,
    const uint32_t *resources,
    uint32_t resource_count,
    ecs_phase_t phase,
    const ecs_system_id_t *after,
    uint32_t after_count,
    void (*callback)(ecs_iter_t *),
    bool disabled
) {
    ecs_system_desc_t desc = {
        .name = name,
        .callback = callback,
        .phase = phase,
        .disabled = disabled,
        .main_thread_only = true,
    };
    siecs_ts_query_terms(
        &desc.query, components, component_count, resources, resource_count
    );
    for (uint32_t index = 0; index < after_count; index++) {
        desc.after[index] = after[index];
    }
    return ecs_system_init(&desc);
}

SIECS_PUBLIC_API ecs_observer_id_t siecs_ts_observer_init(
    ecs_event_t event,
    const uint32_t *components,
    uint32_t component_count,
    ecs_observer_callback_t callback
) {
    ecs_observer_desc_t desc = {
        .on = event,
        .callback = callback,
    };
    siecs_ts_query_terms(&desc.query, components, component_count, NULL, 0);
    return ecs_observer_init(&desc);
}

SIECS_PUBLIC_API ecs_phase_t siecs_ts_phase_init(
    const char *name,
    ecs_phase_t after,
    ecs_phase_t before
) {
    return ecs_phase_init(&(ecs_phase_desc_t){
        .name = name,
        .after = after,
        .before = before,
    });
}

SIECS_PUBLIC_API void
siecs_ts_bench_i32(ecs_query_id_t query, uint32_t field_count) {
    ecs_iter_t iter = ecs_query_iter(query);

    while (ecs_iter_next(&iter)) {
        int32_t *a = ecs_field(&iter, 0);
        int32_t *b = field_count > 1 ? ecs_field(&iter, 1) : NULL;
        int32_t *c = field_count > 2 ? ecs_field(&iter, 2) : NULL;
        int32_t *d = field_count > 3 ? ecs_field(&iter, 3) : NULL;

        for (uint32_t index = 0; index < iter.count; index++) {
            a[index]++;
            if (b) b[index]++;
            if (c) c[index]++;
            if (d) d[index]++;
        }
    }
}

SIECS_PUBLIC_API void siecs_ts_bench_set_i32(
    const ecs_entity_t *entities,
    uint32_t count,
    ecs_component_t component,
    int32_t value
) {
    for (uint32_t index = 0; index < count; index++) {
        *(int32_t *)ecs_get_cid(entities[index], component) = value;
    }
}

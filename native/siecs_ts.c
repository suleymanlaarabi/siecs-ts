#include "../siecs/siecs.h"
#include <stddef.h>

_Static_assert(sizeof(void *) == 4, "siecs-ts requires wasm32 pointers");
_Static_assert(offsetof(ecs_iter_t, count) == 0, "unexpected ecs_iter_t.count offset");
_Static_assert(offsetof(ecs_iter_t, entities) == 4, "unexpected ecs_iter_t.entities offset");
_Static_assert(offsetof(ecs_iter_t, ptrs) == 8, "unexpected ecs_iter_t.ptrs offset");
_Static_assert(offsetof(ecs_iter_t, field_kind_bits) == 20,
               "unexpected ecs_iter_t.field_kind_bits offset");
_Static_assert(sizeof(ecs_iter_t) == 32, "unexpected ecs_iter_t size");

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

SIECS_PUBLIC_API ecs_query_id_t
siecs_ts_query_init(const uint32_t *terms, uint32_t count) {
    ecs_query_desc_t desc = {0};

    for (uint32_t index = 0; index < count; index++) {
        desc.components[index] = (ecs_component_term_t){
            .id = (ecs_component_t)(terms[index] & 0xffffu),
            .access = terms[index] >> 16,
        };
    }

    return ecs_query_init(&desc);
}

SIECS_PUBLIC_API void
siecs_ts_query_iter(ecs_query_id_t query, ecs_iter_t *iter) {
    *iter = ecs_query_iter(query);
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

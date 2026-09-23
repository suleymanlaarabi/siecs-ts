#ifndef SIECS_TS_INTERACTION_H
#define SIECS_TS_INTERACTION_H

#include <siecs.h>

ECS_COMPONENT_DECLARE(PointerEvents, { uint32_t mask; });
enum {
    SiPointerEnterMask = 1u << 0, SiPointerLeaveMask = 1u << 1,
    SiPointerMoveMask = 1u << 2, SiPointerDownMask = 1u << 3,
    SiPointerUpMask = 1u << 4, SiPointerCancelMask = 1u << 5,
    SiClickMask = 1u << 6, SiPressMask = 1u << 7, SiWheelMask = 1u << 8,
};
enum { SiPointerEnter, SiPointerLeave, SiPointerMove, SiPointerDown, SiPointerUp, SiPointerCancel, SiClick, SiPress, SiPointerWheel, SiPointerEventCount };
typedef struct {
    ecs_entity_t target, related_target;
    uint64_t timestamp_ns;
    uint32_t pointer_id, buttons;
    uint16_t modifiers;
    uint8_t pointer_type, button, clicks;
    float x, y, delta_x, delta_y, wheel_x, wheel_y;
    float ray_origin_x, ray_origin_y, ray_origin_z;
    float ray_direction_x, ray_direction_y, ray_direction_z;
    float point_x, point_y, point_z;
    float normal_x, normal_y, normal_z;
    float distance;
} siecs_pointer_event_t;

SIECS_API void siecs_ts_interaction_init(ecs_system_id_t after);
SIECS_PUBLIC_API uint16_t siecs_ts_interaction_component_id(const char *name);
SIECS_PUBLIC_API ecs_event_t siecs_ts_pointer_event_id(uint32_t kind);
SIECS_PUBLIC_API const uint32_t *siecs_ts_pointer_event_abi(void);

#endif

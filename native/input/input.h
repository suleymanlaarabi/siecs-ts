#ifndef SIECS_TS_INPUT_H
#define SIECS_TS_INPUT_H

#include <siecs.h>
#include <SDL3/SDL.h>

ECS_RESOURCE_DECLARE(Keyboard, { bool keys[13]; });
typedef uint8_t EngineKey;
enum { KeyA, KeyD, KeyW, KeyS, KeyQ, KeyZ, KeyE, KeyLeft, KeyRight, KeyUp, KeyDown, KeySpace, KeyI, KeyCount };

ECS_RESOURCE_DECLARE(Pointer, {
    float x; float y; float delta_x; float delta_y; float wheel_x; float wheel_y;
    uint32_t buttons; uint32_t pressed; uint32_t released; uint32_t pointer_id;
    uint8_t pointer_type;
});

enum { SiPointerMouse = 0, SiPointerTouch = 1, SiPointerPen = 2 };
enum { SiInputEdgeDown, SiInputEdgeUp, SiInputEdgeWheel, SiInputEdgeCancel };
#define SIINPUT_POINTER_QUEUE_CAPACITY 64
typedef struct {
    uint64_t timestamp_ns;
    uint32_t pointer_id;
    uint32_t buttons;
    float x; float y; float wheel_x; float wheel_y;
    uint8_t kind; uint8_t button; uint8_t clicks; uint8_t pointer_type;
} siinput_pointer_edge_t;

SIECS_API void siecs_ts_input_init(void);
SIECS_API ecs_system_id_t siecs_ts_input_system(void);
SIECS_API uint16_t siecs_ts_input_resource_id(const char *name);
SIECS_API sireflect_handle_t siecs_ts_input_resource_type(const char *name);
SIECS_API bool siinput_had_motion(void);
SIECS_API uint16_t siinput_modifiers(void);
SIECS_API const siinput_pointer_edge_t *siinput_pointer_edges(uint32_t *count);

#endif

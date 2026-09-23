#ifndef SIECS_TS_RENDERING_H
#define SIECS_TS_RENDERING_H
#include <siecs.h>
ECS_COMPONENT_DECLARE(Color, { uint8_t r; uint8_t g; uint8_t b; uint8_t a; });
ECS_COMPONENT_DECLARE(Cuboid, { float width; float height; float depth; });
ECS_COMPONENT_DECLARE(Bloom, { float intensity; });
ECS_COMPONENT_DECLARE(Camera, { float fov; });
ECS_RESOURCE_DECLARE(WindowConfig, { int width; int height; const char *title; });
ECS_RESOURCE_DECLARE(Sky, { Color color; });
ECS_RESOURCE_DECLARE(Sun, { float x; float y; float z; Color color; float intensity; });
ECS_RESOURCE_DECLARE(AmbientLight, { Color color; float intensity; });
ECS_RESOURCE_DECLARE(Fog, { Color color; float start; float end; });
ECS_RESOURCE_DECLARE(Shadows, { bool enabled; float distance; });
ECS_RESOURCE_DECLARE(Multisampling, { int samples; });
ECS_RESOURCE_DECLARE(BloomSettings, { bool enabled; float threshold; float intensity; });
SIECS_API void siecs_ts_rendering_init(const char *shader_directory);
SIECS_API uint16_t siecs_ts_rendering_component_id(const char *name);
SIECS_API uint16_t siecs_ts_rendering_resource_id(const char *name);
SIECS_API sireflect_handle_t siecs_ts_rendering_resource_type(const char *name);
#endif

#ifndef SIECS_SPATIAL_H
#define SIECS_SPATIAL_H
#include <siecs.h>
#define DEFINE_VEC2(name) ECS_COMPONENT_DECLARE(name, { float x; float y; })
#define DEFINE_VEC3(name) ECS_COMPONENT_DECLARE(name, { float x; float y; float z; })
#define DEFINE_F32(name) ECS_COMPONENT_DECLARE(name, { float value; })
DEFINE_VEC2(Position2d);
DEFINE_VEC2(Velocity2d);
DEFINE_VEC2(GlobalPosition2d);
DEFINE_VEC2(Scale2d);
DEFINE_VEC2(GlobalScale2d);
DEFINE_F32(Rotation2d);
DEFINE_F32(GlobalRotation2d);
DEFINE_VEC3(Position3d);
DEFINE_VEC3(Velocity3d);
DEFINE_VEC3(GlobalPosition3d);
ECS_COMPONENT_DECLARE(Rotation3d, { float pitch; float yaw; float roll; });
ECS_COMPONENT_DECLARE(GlobalOrientation3d, { float x; float y; float z; float w; });
DEFINE_VEC3(Scale3d);
DEFINE_VEC3(GlobalScale3d);
#undef DEFINE_VEC2
#undef DEFINE_VEC3
#undef DEFINE_F32
typedef struct Direction3d { float x; float y; float z; } Direction3d;
SIECS_API Direction3d sispatial_forward_3d(const GlobalOrientation3d *orientation);
ECS_TAG_DECLARE(Static);
ECS_MODULE_DECLARE(sispatial, { uint8_t _unused; });
#endif

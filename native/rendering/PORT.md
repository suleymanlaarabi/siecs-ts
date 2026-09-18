# Native renderer provenance

`sigpu*.c`, `sigpu*.h` and every GLSL/SPIR-V shader come from
`../rtype/engine/rendering`. The GPU renderer, passes, resources, visibility,
math, shader layouts and instance buffers are retained. The sole sigpu change
replaces the build-time shader directory with a runtime directory, joined when
each shader is loaded.

`rendering.c` is the C17 port of `src/rendering.cpp`: C field views retain
shared-field strides; SDL allocations and `qsort` replace cold `std::vector`
and sorting. Shared materials, axis/rotated paths, immutable static snapshots
in 64-unit chunks, camera and shadow bounds, bloom, resources, and the native
ECS system ordering remain intact. The keyboard has all 13 original scancodes,
including I; EngineKey reflection includes I as value 12.

`../siecs/addons/spatial/src/spatial.c` is copied unchanged. Its public header
retains the C field layouts and declarations with C++ methods removed; the
source retains its scale constructors and spatial systems.

## Integration

Call `siecs_ts_rendering_init(shader_directory)` after initializing the existing
SIECS world. It imports spatial, registers reflected components/resources,
opens the default R-Type window (1280×800, MSAA 4), and installs native ECS
systems. It creates no additional world. The directory must contain the bundled
SPIR-V files and may be relocated with the package.

`siecs_ts_rendering_component_id(name)` resolves rendering and spatial IDs.
`siecs_ts_rendering_resource_id(name)` and
`siecs_ts_rendering_resource_type(name)` resolve singleton IDs and reflected
types. Unknown names return zero. Resource writes through SIECS invoke the
original native setting hooks. Keyboard is filled in PreUpdate. Camera,
static collection and shadow bounds execute in PreRender; culling and dynamic
collection in OnRender; GPU submission in PostRender. `ecs_at_fini` releases
GPU/SDL state and resets the static cache for another world.

## Validation

The copied sigpu files (apart from the two shader-path changes), every shader,
and spatial source were verified byte-for-byte against their source files.
The following check passes without diagnostics:

```sh
clang -std=c17 -D_POSIX_C_SOURCE=200809L -I siecs -I native/spatial/include \
  $(pkg-config --cflags sdl3) -fsyntax-only native/rendering/*.c native/spatial/src/spatial.c
```

Window/runtime validation belongs to the package integration. No automated
rendering or UI test is added. Static renderables retain the original invariant:
they are immutable after the first PreRender snapshot. SDL/GPU setup retains
the source renderer's assumptions and error behavior.

#include "../picking.h"
#include <stdint.h>
#include <stdio.h>
#include <time.h>

static double seconds(void) {
    struct timespec time;
    clock_gettime(CLOCK_MONOTONIC, &time);
    return (double)time.tv_sec + (double)time.tv_nsec / 1000000000.0;
}

static void run(const char *name, uint32_t candidates, sipicking_quat_t orientation) {
    const sipicking_ray_t ray = { { 0, 0, -10 }, { 0, 0, 1 } };
    const sipicking_vec3_t half = { 0.5f, 0.5f, 0.5f };
    sipicking_hit_t hit;
    volatile float sink = 0;
    const uint32_t frames = candidates ? 1000 : 100000;
    const double start = seconds();
    for (uint32_t frame = 0; frame < frames; frame++) {
        for (uint32_t index = 0; index < candidates; index++) {
            const float x = ((float)(index % 251) - 125.0f) * 1.1f;
            const float y = ((float)((index / 251) % 251) - 125.0f) * 1.1f;
            if (sipicking_ray_obb(ray, (sipicking_vec3_t){ x, y, (float)(index / 63001) }, orientation, half, &hit)) sink += hit.distance;
        }
    }
    const double elapsed = seconds() - start;
    printf("%s %u candidates: %.3f us/frame (sink %.1f)\n", name, candidates, elapsed * 1000000.0 / frames, sink);
}

int main(void) {
    const sipicking_quat_t axis = { 0, 0, 0, 1 };
    const sipicking_quat_t rotated = { 0, 0.3826834324f, 0, 0.9238795325f };
    const uint32_t counts[] = { 0, 100, 1000, 10000, 100000 };
    for (uint32_t i = 0; i < sizeof(counts) / sizeof(*counts); i++) {
        run("axis", counts[i], axis);
        run("rotated", counts[i], rotated);
    }
    return 0;
}

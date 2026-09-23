#include "../picking.h"
#include <assert.h>
#include <math.h>

static sipicking_ray_t ray(float x, float y, float z, float dx, float dy, float dz) {
    return (sipicking_ray_t){ { x, y, z }, { dx, dy, dz } };
}
static int closef(float a, float b) { return fabsf(a - b) < 1e-4f; }

int main(void) {
    const sipicking_vec3_t zero = { 0, 0, 0 }, half = { 1, 1, 1 };
    const sipicking_quat_t identity = { 0, 0, 0, 1 };
    sipicking_hit_t hit;
    assert(sipicking_ray_obb(ray(0, 0, -3, 0, 0, 1), zero, identity, half, &hit));
    assert(closef(hit.distance, 2) && closef(hit.point.z, -1) && closef(hit.normal.z, -1));
    assert(!sipicking_ray_obb(ray(3, 0, -3, 0, 0, 1), zero, identity, half, &hit));
    assert(sipicking_ray_obb(ray(1, 0, -3, 0, 0, 1), zero, identity, half, &hit));
    assert(sipicking_ray_obb(ray(0, 0, 0, 1, 0, 0), zero, identity, half, &hit));
    assert(closef(hit.distance, 1) && closef(hit.normal.x, 1));
    assert(!sipicking_ray_obb(ray(0, 0, 3, 0, 0, 1), zero, identity, half, &hit));
    const float s = 0.70710678118f;
    const sipicking_quat_t rotated = { 0, s, 0, s };
    assert(sipicking_ray_obb(ray(0, 0, -3, 0, 0, 1), zero, rotated, half, &hit));
    assert(closef(hit.distance, 2));
    assert(sipicking_ray_obb(ray(0, 0, -3, 0, 0, 1), zero, identity, (sipicking_vec3_t){ -2, 1, 0.5f }, &hit));
    assert(closef(hit.distance, 2.5f));
    const sipicking_quat_t arbitrary = { 0.1825741858f, 0.3651483717f, 0.5477225575f, 0.7302967433f };
    assert(sipicking_ray_obb(ray(0, 0, -4, 0, 0, 1), zero, arbitrary, (sipicking_vec3_t){ 2, 1, 0.5f }, &hit));
    assert(isfinite(hit.distance) && isfinite(hit.normal.x) && isfinite(hit.normal.y) && isfinite(hit.normal.z));
    sipicking_hit_t near, far;
    assert(sipicking_ray_obb(ray(0, 0, -5, 0, 0, 1), (sipicking_vec3_t){ 0, 0, 0 }, identity, half, &near));
    assert(sipicking_ray_obb(ray(0, 0, -5, 0, 0, 1), (sipicking_vec3_t){ 0, 0, 4 }, identity, half, &far));
    assert(near.distance < far.distance);
    assert(!sipicking_ray_obb(ray(2, 0, -3, 0, 1e-12f, 1), zero, identity, half, &hit));
    return 0;
}

import type * as BABYLON from "../babylon";

/** Small math helpers shared across the scene code. */

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Smooth 0..1 ramp between edge0 and edge1 (Hermite, like GLSL's smoothstep). */
export function smoothStep(edge0: number, edge1: number, value: number): number {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - (2 * t));
}

/** Rotation of a mesh around the world Y axis, whether it uses a quaternion or Euler angles. */
export function getYaw(mesh: BABYLON.AbstractMesh): number {
    return mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles().y : mesh.rotation.y;
}

/** Squared distance from a point to the segment between start and end. */
export function segmentDistanceSquared(start: BABYLON.Vector3, end: BABYLON.Vector3, point: BABYLON.Vector3): number {
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const sz = end.z - start.z;
    const lengthSquared = (sx * sx) + (sy * sy) + (sz * sz);
    let t = 0;
    if (lengthSquared > 0) {
        t = (((point.x - start.x) * sx) + ((point.y - start.y) * sy) + ((point.z - start.z) * sz)) / lengthSquared;
        t = clamp(t, 0, 1);
    }

    const dx = start.x + (sx * t) - point.x;
    const dy = start.y + (sy * t) - point.y;
    const dz = start.z + (sz * t) - point.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
}

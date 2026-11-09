import * as BABYLON from "../babylon";

import { buildMesh, createRoundedBox, createToyMaterial, pushOrientedTriangle } from "../core/toyStyle";
import { addStaticBox } from "../core/staticBodies";
import { GROUND_Y } from "../core/constants";

/**
 * Toy playground pieces to drive over and knock around:
 *
 * - a stunt park: a slalom of toy traffic cones leading to a kicker ramp, a gap, and a landing ramp,
 * - a hump bridge near the start: up a ramp, over a platform and down the other side.
 *
 * Ramps and platforms are solid for loose objects (bricks, cones, shots), but not for the tank: the
 * tank rides on them through `getPlaygroundHeight`, which tank/movement.ts uses for its own simple vertical
 * movement (so it follows the slopes smoothly, flies off ramp ends and lands).
 */

/** Ramps and platforms sit this far above the ground, just above any road under them. */
const SURFACE_LIFT = 0.05;
/**
 * cannon.js collision groups. Everything is in group 1 and collides with group 1 (cannon's
 * default). Ramps and platforms are in their own group, which only loose objects (bricks, cones,
 * trophies, shots) add to their collision mask with `collideWithRamps`; the tank doesn't, so it
 * drives onto them using its own height logic instead.
 */
const DEFAULT_COLLISION_GROUP = 1;
export const RAMP_COLLISION_GROUP = 2;

/** Lets a loose object's body collide with the ramps and platforms too. */
export function collideWithRamps(impostor: BABYLON.PhysicsImpostor | null | undefined): void {
    const body = impostor?.physicsBody as { collisionFilterMask?: number } | null | undefined;
    if (body) {
        body.collisionFilterMask = DEFAULT_COLLISION_GROUP | RAMP_COLLISION_GROUP;
    }
}

export type Ramp = {
    name: string;
    /** Centre of the ramp's footprint. */
    x: number;
    z: number;
    /** Direction the ramp rises towards (0 = +Z, PI/2 = +X). */
    yaw: number;
    length: number;
    width: number;
    height: number;
};

type Platform = {
    name: string;
    x: number;
    z: number;
    yaw: number;
    length: number;
    width: number;
    height: number;
};

export const RAMPS: readonly Ramp[] = [
    // Stunt park: kicker (rising towards +X), a 14-unit gap, then the landing ramp (rising towards
    // -X). At full speed the tank clears the gap and lands about half way down the landing ramp.
    { name: "stunt-kicker", x: 113, z: -25, yaw: Math.PI / 2, length: 18, width: 16, height: 5 },
    { name: "stunt-landing", x: 147, z: -25, yaw: -Math.PI / 2, length: 22, width: 16, height: 5 },
    // Hump bridge south-east of the start.
    { name: "hump-up", x: 32, z: -70, yaw: Math.PI / 2, length: 12, width: 14, height: 3 },
    { name: "hump-down", x: 50, z: -70, yaw: -Math.PI / 2, length: 12, width: 14, height: 3 },
];

const PLATFORMS: Platform[] = [
    { name: "hump-top", x: 41, z: -70, yaw: Math.PI / 2, length: 6, width: 14, height: 3 },
];

const CONES: { x: number; z: number }[] = Array.from({ length: 7 }, (_, i) => ({
    x: 58 + (i * 6.5),
    z: -25 + (i % 2 === 0 ? 4.5 : -4.5),
}));

/** Run-up lanes that decorations (bushes, boulders) must keep clear of. */
export const PLAYGROUND_LANES: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [
    { minX: 40, maxX: 165, minZ: -38, maxZ: -12 },
    { minX: 0, maxX: 80, minZ: -82, maxZ: -58 },
];

const PALETTE = {
    rampTop: "#F4EBDD",
    rampStripe: "#E8869F",
    rampSide: "#456F99",
    rampRail: "#344B63",
    cone: "#E8743B",
    coneStripe: "#F4EBDD",
    coneBase: "#344B63",
};

/**
 * Height of the playground surface (ramps and platforms) above the ground at a point, or 0 where
 * there is none.
 */
export function getPlaygroundHeight(x: number, z: number): number {
    let height = 0;
    for (const ramp of RAMPS) {
        const local = toLocal(ramp, x, z);
        if (Math.abs(local.across) <= ramp.width / 2 && Math.abs(local.along) <= ramp.length / 2) {
            height = Math.max(height, ramp.height * ((local.along + (ramp.length / 2)) / ramp.length));
        }
    }
    for (const platform of PLATFORMS) {
        const local = toLocal(platform, x, z);
        if (Math.abs(local.across) <= platform.width / 2 && Math.abs(local.along) <= platform.length / 2) {
            height = Math.max(height, platform.height);
        }
    }
    return height;
}

function toLocal(shape: { x: number; z: number; yaw: number }, x: number, z: number): { along: number; across: number } {
    const dx = x - shape.x;
    const dz = z - shape.z;
    const sin = Math.sin(shape.yaw);
    const cos = Math.cos(shape.yaw);
    return { along: (dx * sin) + (dz * cos), across: (dx * cos) - (dz * sin) };
}

export function createPlayground(scene: BABYLON.Scene): void {
    const materials = {
        top: createStripedMaterial(scene),
        side: createToyMaterial(scene, "toy-ramp-side", PALETTE.rampSide, { roughness: 0.45, clearCoat: 0.4 }),
        rail: createToyMaterial(scene, "toy-ramp-rail", PALETTE.rampRail, { roughness: 0.4, clearCoat: 0.5 }),
    };

    for (const ramp of RAMPS) {
        try {
            createRamp(scene, ramp, materials);
        } catch (error) {
            console.error(`Ramp "${ramp.name}" failed`, error);
        }
    }
    for (const platform of PLATFORMS) {
        try {
            createPlatform(scene, platform, materials);
        } catch (error) {
            console.error(`Platform "${platform.name}" failed`, error);
        }
    }
    try {
        createCones(scene);
    } catch (error) {
        console.error("Cones failed", error);
    }
}

type RampMaterials = { top: BABYLON.Material; side: BABYLON.Material; rail: BABYLON.Material };

/**
 * A wedge: striped top sloping up along local +Z, blue sides and back, and a rail along each top
 * edge. Plus an invisible tilted slab under the slope for loose objects to collide with.
 */
function createRamp(scene: BABYLON.Scene, ramp: Ramp, materials: RampMaterials): void {
    const { length: l, width: w, height: h } = ramp;
    const root = new BABYLON.TransformNode(`ramp-${ramp.name}`, scene);
    // Raised a hair so roads running underneath don't poke through the low edge.
    root.position.set(ramp.x, GROUND_Y + SURFACE_LIFT, ramp.z);
    root.rotation.y = ramp.yaw;

    // Top: a single quad from the low edge (z = -l/2, y = 0) to the high edge (z = l/2, y = h).
    const top = buildQuad(`ramp-${ramp.name}-top`, [
        [-w / 2, 0.02, -l / 2], [w / 2, 0.02, -l / 2], [w / 2, h, l / 2], [-w / 2, h, l / 2],
    ], scene, { u: w / 6, v: Math.hypot(l, h) / 6 });
    top.material = materials.top;
    top.parent = root;

    // Sides (triangles) and the back (a rectangle at the high end).
    const sides: BABYLON.Mesh[] = [];
    for (const side of [-1, 1]) {
        sides.push(buildTriangle(`ramp-${ramp.name}-side-${side}`, [
            [side * w / 2, 0, -l / 2], [side * w / 2, 0, l / 2], [side * w / 2, h, l / 2],
        ], side, scene));
    }
    sides.push(buildQuad(`ramp-${ramp.name}-back`, [
        [-w / 2, 0, l / 2], [w / 2, 0, l / 2], [w / 2, h, l / 2], [-w / 2, h, l / 2],
    ], scene));
    const body = BABYLON.Mesh.MergeMeshes(sides, true, true);
    if (body) {
        body.name = `ramp-${ramp.name}-body`;
        body.material = materials.side;
        body.parent = root;
    }

    // Rounded rails along the top edges, following the slope.
    const slope = Math.atan2(h, l);
    const slopeLength = Math.hypot(l, h);
    for (const side of [-1, 1]) {
        const rail = createRoundedBox(`ramp-${ramp.name}-rail-${side}`, 0.7, 0.6, slopeLength, 0.25, scene);
        rail.material = materials.rail;
        rail.parent = root;
        rail.rotation.x = -slope;
        rail.position.set(side * ((w / 2) - 0.2), (h / 2) + 0.2, 0);
    }

    for (const mesh of root.getChildMeshes()) {
        mesh.isPickable = false;
    }

    // Collider for loose objects: a slab whose top is the slope.
    const thickness = Math.min(2, h);
    const normal = new BABYLON.Vector3(0, Math.cos(slope), -Math.sin(slope));
    const center = new BABYLON.Vector3(0, h / 2, 0).subtract(normal.scale(thickness / 2));
    const worldCenter = BABYLON.Vector3.TransformCoordinates(center, BABYLON.Matrix.RotationY(ramp.yaw));
    addStaticBox(scene, new BABYLON.Vector3(ramp.x + worldCenter.x, GROUND_Y + worldCenter.y, ramp.z + worldCenter.z), w, thickness, slopeLength, {
        rotation: BABYLON.Quaternion.RotationYawPitchRoll(ramp.yaw, -slope, 0),
        ...LOOSE_OBJECTS_ONLY,
    });
}

/** A flat-topped block with the same look as the ramps. */
function createPlatform(scene: BABYLON.Scene, platform: Platform, materials: RampMaterials): void {
    const root = new BABYLON.TransformNode(`platform-${platform.name}`, scene);
    root.position.set(platform.x, GROUND_Y + SURFACE_LIFT, platform.z);
    root.rotation.y = platform.yaw;

    const block = createRoundedBox(`platform-${platform.name}-body`, platform.width, platform.height, platform.length, 0.15, scene);
    block.material = materials.side;
    block.parent = root;
    block.position.y = platform.height / 2;

    const top = buildQuad(`platform-${platform.name}-top`, [
        [-platform.width / 2, platform.height + 0.02, -platform.length / 2],
        [platform.width / 2, platform.height + 0.02, -platform.length / 2],
        [platform.width / 2, platform.height + 0.02, platform.length / 2],
        [-platform.width / 2, platform.height + 0.02, platform.length / 2],
    ], scene, { u: platform.width / 6, v: platform.length / 6 });
    top.material = materials.top;
    top.parent = root;

    for (const side of [-1, 1]) {
        const rail = createRoundedBox(`platform-${platform.name}-rail-${side}`, 0.7, 0.6, platform.length, 0.25, scene);
        rail.material = materials.rail;
        rail.parent = root;
        rail.position.set(side * ((platform.width / 2) - 0.2), platform.height + 0.2, 0);
    }
    for (const mesh of root.getChildMeshes()) {
        mesh.isPickable = false;
    }

    addStaticBox(scene, new BABYLON.Vector3(platform.x, GROUND_Y + (platform.height / 2), platform.z), platform.width, platform.height, platform.length, {
        rotation: BABYLON.Quaternion.RotationYawPitchRoll(platform.yaw, 0, 0),
        ...LOOSE_OBJECTS_ONLY,
    });
}

/** Ramps and platforms collide with loose objects but let the tank through (it rides on the height map). */
const LOOSE_OBJECTS_ONLY = { group: RAMP_COLLISION_GROUP, mask: DEFAULT_COLLISION_GROUP, sound: "ramp" as const };

/**
 * Toy traffic cones: navy base, orange cone with a cream band. Light and loose, so the tank and
 * shots send them flying.
 */
function createCones(scene: BABYLON.Scene): void {
    const coneMaterial = createToyMaterial(scene, "toy-cone", PALETTE.cone, { roughness: 0.4, clearCoat: 0.6 });
    const stripeMaterial = createToyMaterial(scene, "toy-cone-stripe", PALETTE.coneStripe, { roughness: 0.4, clearCoat: 0.6 });
    const baseMaterial = createToyMaterial(scene, "toy-cone-base", PALETTE.coneBase, { roughness: 0.45, clearCoat: 0.4 });

    CONES.forEach((spot, i) => {
        const height = 3.4;
        // The body is the collider: physics first, then the visible parts are parented to it.
        const collider = BABYLON.MeshBuilder.CreateCylinder(`cone-${i}`, { diameter: 2.2, height, tessellation: 12 }, scene);
        collider.position.set(spot.x, GROUND_Y + (height / 2) + 0.02, spot.z);
        collider.isVisible = false;
        collider.isPickable = false;
        collider.physicsImpostor = new BABYLON.PhysicsImpostor(collider, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 0.4, friction: 0.6, restitution: 0.2 }, scene);

        const parts: BABYLON.Mesh[] = [];
        const base = createRoundedBox(`cone-${i}-base`, 2.5, 0.4, 2.5, 0.15, scene, 2);
        base.material = baseMaterial;
        base.position.y = (-height / 2) + 0.2;
        parts.push(base);

        const cone = BABYLON.MeshBuilder.CreateCylinder(`cone-${i}-body`, { diameterTop: 0.35, diameterBottom: 1.9, height: height - 0.4, tessellation: 24 }, scene);
        cone.material = coneMaterial;
        cone.position.y = 0.2;
        parts.push(cone);

        const stripe = BABYLON.MeshBuilder.CreateCylinder(`cone-${i}-stripe`, { diameterTop: 0.95, diameterBottom: 1.3, height: 0.7, tessellation: 24 }, scene);
        stripe.material = stripeMaterial;
        stripe.position.y = 0.45;
        parts.push(stripe);

        for (const part of parts) {
            part.parent = collider;
            part.isPickable = false;
            part.metadata = { keepUnfrozen: true };
        }
    });
}

/** Cream top with diagonal pink stripes, repeated over the surface. */
function createStripedMaterial(scene: BABYLON.Scene): BABYLON.PBRMaterial {
    const size = 256;
    const texture = new BABYLON.DynamicTexture("toy-ramp-stripes", { width: size, height: size }, scene, true);
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.fillStyle = PALETTE.rampTop;
    context.fillRect(0, 0, size, size);
    // Chevrons pointing up the slope (V runs along the slope).
    context.fillStyle = PALETTE.rampStripe;
    for (let i = 0; i < 2; i++) {
        const y = (i * size) / 2;
        context.beginPath();
        context.moveTo(0, y + (size * 0.3));
        context.lineTo(size / 2, y + (size * 0.05));
        context.lineTo(size, y + (size * 0.3));
        context.lineTo(size, y + (size * 0.42));
        context.lineTo(size / 2, y + (size * 0.17));
        context.lineTo(0, y + (size * 0.42));
        context.closePath();
        context.fill();
    }
    texture.update();
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

    const material = createToyMaterial(scene, "toy-ramp-top", "#FFFFFF", { roughness: 0.5, clearCoat: 0.3 });
    material.albedoTexture = texture;
    return material;
}

function buildQuad(name: string, corners: [number, number, number][], scene: BABYLON.Scene, uvScale = { u: 1, v: 1 }): BABYLON.Mesh {
    const positions = corners.flat();
    const a = BABYLON.Vector3.FromArray(corners[0]);
    const b = BABYLON.Vector3.FromArray(corners[1]);
    const d = BABYLON.Vector3.FromArray(corners[3]);
    // Normal pointing out of the shape: up for the tops, +Z for the back.
    let normal = BABYLON.Vector3.Cross(d.subtract(a), b.subtract(a)).normalize();
    if (normal.y < -0.01 || (Math.abs(normal.y) < 0.01 && normal.z < 0)) {
        normal = normal.scale(-1);
    }
    const normals = [0, 1, 2, 3].flatMap(() => [normal.x, normal.y, normal.z]);
    const indices: number[] = [];
    pushOrientedTriangle(indices, positions, normals, 0, 1, 2);
    pushOrientedTriangle(indices, positions, normals, 0, 2, 3);
    const uvs = [0, 0, uvScale.u, 0, uvScale.u, uvScale.v, 0, uvScale.v];
    return buildMesh(name, positions, normals, indices, scene, uvs);
}

function buildTriangle(name: string, corners: [number, number, number][], side: number, scene: BABYLON.Scene): BABYLON.Mesh {
    const positions = corners.flat();
    const normals = [0, 1, 2].flatMap(() => [side, 0, 0]);
    const indices: number[] = [];
    pushOrientedTriangle(indices, positions, normals, 0, 1, 2);
    return buildMesh(name, positions, normals, indices, scene, [0, 0, 1, 0, 1, 1]);
}

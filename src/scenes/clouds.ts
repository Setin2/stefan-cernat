import * as BABYLON from "@babylonjs/core";

import { SUN_DIRECTION } from "./shadows";
import { createLumpyBall, createRandom, createToyMaterial } from "./toyStyle";

/**
 * Chunky toy clouds drifting low over the world, each with a soft shadow patch sliding over the
 * ground beneath it.
 *
 * The camera looks down at the tank from above, so the clouds float fairly low (24-34 units up,
 * still well above the trees) to be seen at all. A cloud that drifts in between the camera and the
 * tank fades out (its shadow stays), so it never hides what you're driving, and so do clouds close
 * to the camera. Clouds that drift too far from the tank wrap around to the other side, so there
 * are always some about wherever you go.
 */

const CLOUD_COUNT = 14;
/** Clouds live in a square this many units either side of the tank. */
const AREA_HALF = 260;
const MIN_HEIGHT = 24;
const MAX_HEIGHT = 34;
const WIND = new BABYLON.Vector3(3.2, 0, 1.1);
const GROUND_Y = -0.5;
/** Shadow patches sit just above the road slabs and tread prints. */
const SHADOW_Y = GROUND_Y + 0.19;
/** Extra clearance (on top of the cloud's own size) kept around the camera's view of the tank. */
const VIEW_CLEARANCE = 8;
/** Clouds closer than this to the camera (plus their size) fade out, so none fill the screen. */
const CAMERA_CLEARANCE = 80;

type Cloud = {
    mesh: BABYLON.Mesh;
    shadow: BABYLON.Mesh;
    radius: number;
    /** Current fade (0 hidden, 1 fully shown). */
    fade: number;
};

export function createClouds(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh, camera: BABYLON.Camera): void {
    const random = createRandom(77);

    const material = createToyMaterial(scene, "toy-cloud", "#FFFFFF", { roughness: 0.85, clearCoat: 0.15 });
    // Keep them bright white even on their shaded side, like painted plastic clouds.
    material.emissiveColor = BABYLON.Color3.FromHexString("#DCE6F2").toLinearSpace().scale(0.35);
    // Fading a cloud made of overlapping puffs needs a depth pre-pass, or the inner puffs show through.
    material.needDepthPrePass = true;

    const shadowMaterial = new BABYLON.StandardMaterial("cloud-shadow-material", scene);
    shadowMaterial.diffuseColor = BABYLON.Color3.Black();
    shadowMaterial.specularColor = BABYLON.Color3.Black();
    shadowMaterial.emissiveColor = BABYLON.Color3.FromHexString("#123248");
    shadowMaterial.disableLighting = true;
    shadowMaterial.opacityTexture = createSoftDiscTexture(scene);
    shadowMaterial.alpha = 0.3;
    shadowMaterial.zOffset = -3;

    const clouds: Cloud[] = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
        const { mesh, radius } = buildCloud(scene, `cloud-${i}`, random, material);
        mesh.position.set(
            tank.position.x + ((random() * 2) - 1) * AREA_HALF,
            MIN_HEIGHT + (random() * (MAX_HEIGHT - MIN_HEIGHT)),
            tank.position.z + ((random() * 2) - 1) * AREA_HALF,
        );
        mesh.rotation.y = random() * Math.PI * 2;

        const shadow = BABYLON.MeshBuilder.CreateDisc(`cloud-shadow-${i}`, { radius: radius * 1.05, tessellation: 32 }, scene);
        shadow.rotation.x = Math.PI / 2;
        shadow.scaling.y = 0.7;
        shadow.material = shadowMaterial;
        shadow.isPickable = false;
        shadow.metadata = { keepUnfrozen: true };

        clouds.push({ mesh, shadow, radius, fade: 1 });
    }

    const step = new BABYLON.Vector3();
    const groundOffset = new BABYLON.Vector3();
    const observer = scene.onBeforeRenderObservable.add(() => {
        const deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        WIND.scaleToRef(deltaSeconds, step);

        for (const cloud of clouds) {
            const position = cloud.mesh.position;
            position.addInPlace(step);

            // Wrap around the tank so clouds keep coming wherever it drives.
            let wrapped = false;
            for (const axis of ["x", "z"] as const) {
                const offset = position[axis] - tank.position[axis];
                if (offset > AREA_HALF) {
                    position[axis] -= AREA_HALF * 2;
                    wrapped = true;
                } else if (offset < -AREA_HALF) {
                    position[axis] += AREA_HALF * 2;
                    wrapped = true;
                }
            }
            if (wrapped) {
                // Pop in faded out; it fades back in below.
                cloud.fade = 0;
            }

            // Fade out while between the camera and the tank.
            const clearance = cloud.radius + VIEW_CLEARANCE;
            const nearCamera = BABYLON.Vector3.DistanceSquared(camera.position, position) < (cloud.radius + CAMERA_CLEARANCE) ** 2;
            const blocking = nearCamera || segmentDistanceSquared(camera.position, tank.position, position) < clearance * clearance;
            const target = blocking ? 0 : 1;
            cloud.fade += (target - cloud.fade) * Math.min(1, deltaSeconds * 3);
            cloud.mesh.visibility = cloud.fade;
            cloud.mesh.isVisible = cloud.fade > 0.02;

            // The shadow lies on the ground where the sunlight through the cloud's centre lands.
            SUN_DIRECTION.scaleToRef((position.y - SHADOW_Y) / -SUN_DIRECTION.y, groundOffset);
            cloud.shadow.position.set(position.x + groundOffset.x, SHADOW_Y, position.z + groundOffset.z);
            cloud.shadow.rotation.y = cloud.mesh.rotation.y;
            cloud.shadow.visibility = wrapped ? 0 : Math.min(1, cloud.shadow.visibility + (deltaSeconds * 0.5));
        }
    });
    scene.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(observer));
}

/**
 * One cloud: a flat-bottomed cluster of soft lumpy puffs, biggest in the middle, merged into a
 * single mesh so it can fade as a whole.
 */
function buildCloud(scene: BABYLON.Scene, name: string, random: () => number, material: BABYLON.Material): { mesh: BABYLON.Mesh; radius: number } {
    const length = 16 + (random() * 14);
    const puffCount = 5 + Math.floor(random() * 3);
    const puffs: BABYLON.Mesh[] = [];
    for (let i = 0; i < puffCount; i++) {
        const t = puffCount === 1 ? 0.5 : i / (puffCount - 1);
        // Bigger towards the middle, a little jitter in depth and height.
        const size = (length * 0.22) * (0.7 + (Math.sin(t * Math.PI) * 0.6)) * (0.85 + (random() * 0.3));
        const puff = createLumpyBall(`${name}-puff-${i}`, scene, random, 1.2, 3);
        puff.scaling.set(size, size * 0.82, size * 0.9);
        puff.position.set((t - 0.5) * length, size * 0.35 * Math.sin(t * Math.PI), (random() - 0.5) * size * 0.8);
        puffs.push(puff);
    }
    // A couple of puffs on top for a fluffier silhouette.
    for (let i = 0; i < 2; i++) {
        const size = length * (0.17 + (random() * 0.06));
        const puff = createLumpyBall(`${name}-top-${i}`, scene, random, 1.2, 3);
        puff.scaling.set(size, size * 0.85, size * 0.9);
        puff.position.set((random() - 0.5) * length * 0.45, length * 0.2, (random() - 0.5) * size * 0.6);
        puffs.push(puff);
    }

    const mesh = BABYLON.Mesh.MergeMeshes(puffs, true, true) ?? puffs[0];
    mesh.name = name;

    // Flatten the bottom: squash everything below the base line up onto it.
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    if (positions && normals) {
        const baseY = -length * 0.06;
        for (let i = 0; i < positions.length; i += 3) {
            if (positions[i + 1] < baseY) {
                positions[i + 1] = baseY + ((positions[i + 1] - baseY) * 0.25);
                normals[i] *= 0.4;
                normals[i + 1] = Math.min(normals[i + 1], -0.6);
                normals[i + 2] *= 0.4;
                const n = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
                normals[i] /= n;
                normals[i + 1] /= n;
                normals[i + 2] /= n;
            }
        }
        mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.refreshBoundingInfo();
    }

    mesh.material = material;
    mesh.isPickable = false;
    mesh.metadata = { keepUnfrozen: true };
    return { mesh, radius: length * 0.6 };
}

/** White disc fading to transparent at the edge, for the soft cloud shadows. */
function createSoftDiscTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
    const size = 128;
    const texture = new BABYLON.DynamicTexture("cloud-shadow-texture", { width: size, height: size }, scene, true);
    const context = texture.getContext() as CanvasRenderingContext2D;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.85)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.update();
    texture.hasAlpha = true;
    texture.getAlphaFromRGB = false;
    return texture;
}

function segmentDistanceSquared(start: BABYLON.Vector3, end: BABYLON.Vector3, point: BABYLON.Vector3): number {
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const sz = end.z - start.z;
    const lengthSquared = (sx * sx) + (sy * sy) + (sz * sz);
    let t = 0;
    if (lengthSquared > 0) {
        t = Math.max(0, Math.min(1, (((point.x - start.x) * sx) + ((point.y - start.y) * sy) + ((point.z - start.z) * sz)) / lengthSquared));
    }
    const dx = start.x + (sx * t) - point.x;
    const dy = start.y + (sy * t) - point.y;
    const dz = start.z + (sz * t) - point.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
}

import * as BABYLON from "../babylon";

import { createRoadNetwork } from "./roads";
import { addStaticBox } from "../core/staticBodies";
import { createLumpyBall, createRandom, createRoundedBox, createToyMaterial } from "../core/toyStyle";
import { smoothStep } from "../core/math";

/**
 * Restyles static landmarks from the editor scene to match the toy look: the social-media podium,
 * the roads (replaced by the road network in roads.ts) and the signs lying on the ground. The
 * original meshes keep their role (the podium keeps its physics body and the logos parented to
 * it); they are only hidden and replaced by toy-style geometry.
 */

const PALETTE = {
    podiumBody: "#E8DCC6",
    first: "#C9A35B",
    third: "#B07A52",
    second: "#AEB8C2",
    numbers: "#344B63",
    logoBlue: "#456F99",
    logoSakura: "#E8869F",
    slabs: ["#D8CBB4", "#CFC1A8", "#E0D4BF", "#C9B79C"],
    mortar: "#8F8372",
    edgePebbles: ["#9C9282", "#B3A893"],
    cobbleTint: "#C4C2BC",
};

export function restyleLandmarks(scene: BABYLON.Scene): void {
    try {
        restylePodium(scene);
    } catch (error) {
        console.error("Podium restyle failed, keeping the original", error);
    }

    try {
        createRoads(scene);
    } catch (error) {
        console.error("Roads failed", error);
    }
}

// ==================================================================== Podium

/**
 * The podium mesh is three boxes side by side (2nd, 1st, 3rd place). These are their extents in
 * the podium's local space, taken from its geometry; local +Z is up and local +Y is the front.
 * The third step no longer has a logo or target (X/Twitter was removed).
 */
const PODIUM_STEPS = [
    { place: 2, minX: -2.7, maxX: -1, topZ: 0.3 },
    { place: 1, minX: -1, maxX: 1, topZ: 1 },
    { place: 3, minX: 1, maxX: 2.64, topZ: -0.25 },
];

function restylePodium(scene: BABYLON.Scene): void {
    const podium = scene.getMeshByName("podium");
    if (!podium) {
        return;
    }

    podium.computeWorldMatrix(true);
    const world = podium.getWorldMatrix();
    const front = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 1, 0), world).normalize();

    const bodyMaterial = createToyMaterial(scene, "toy-podium-body", PALETTE.podiumBody, { roughness: 0.5, clearCoat: 0.35 });
    const capMaterials: Record<number, BABYLON.Material> = {
        1: createToyMaterial(scene, "toy-podium-first", PALETTE.first, { roughness: 0.3, metallic: 0.6, clearCoat: 0.4 }),
        2: createToyMaterial(scene, "toy-podium-second", PALETTE.second, { roughness: 0.3, metallic: 0.6, clearCoat: 0.4 }),
        3: createToyMaterial(scene, "toy-podium-third", PALETTE.third, { roughness: 0.35, metallic: 0.5, clearCoat: 0.4 }),
    };

    const capThickness = 1.4;
    const capOverhang = 0.3;

    for (const step of PODIUM_STEPS) {
        // World-space box of this step (the podium is only rotated by multiples of 90°).
        const corners = [
            new BABYLON.Vector3(step.minX, -1, -1),
            new BABYLON.Vector3(step.maxX, 1, step.topZ),
        ].map((corner) => BABYLON.Vector3.TransformCoordinates(corner, world));
        const min = BABYLON.Vector3.Minimize(corners[0], corners[1]);
        const max = BABYLON.Vector3.Maximize(corners[0], corners[1]);
        const size = max.subtract(min);
        const center = min.add(max).scaleInPlace(0.5);

        // Body, slightly inset so neighbouring steps read as separate blocks.
        const bodyHeight = size.y - capThickness + 0.2;
        const body = createRoundedBox(`podium-step-${step.place}`, size.x - 0.3, bodyHeight, size.z - 0.3, 0.9, scene);
        body.material = bodyMaterial;
        body.position.set(center.x, min.y + (bodyHeight / 2), center.z);

        // Medal-coloured cap; its top is exactly the old step top, where the logos stand.
        const cap = createRoundedBox(`podium-cap-${step.place}`, size.x + (capOverhang * 2) - 0.3, capThickness, size.z + (capOverhang * 2) - 0.3, 0.5, scene);
        cap.material = capMaterials[step.place];
        cap.position.set(center.x, max.y - (capThickness / 2), center.z);

        // Place number on the front face.
        const numberSize = Math.min(size.x, size.z, bodyHeight) * 0.55;
        const number = BABYLON.MeshBuilder.CreatePlane(`toy-place-number-${step.place}`, { size: numberSize }, scene);
        number.material = createNumberMaterial(scene, step.place);
        const frontOffset = (Math.abs(front.x) * size.x / 2) + (Math.abs(front.z) * size.z / 2) - 0.1;
        number.position.set(
            center.x + (front.x * frontOffset),
            min.y + (bodyHeight * 0.5),
            center.z + (front.z * frontOffset),
        );
        // A plane faces -Z; turn it to face the podium's front.
        number.rotation.y = Math.atan2(-front.x, -front.z);

        [body, cap, number].forEach((mesh) => {
            mesh.isPickable = false;
        });

        // Solid step (replacing the old three-step physics body below).
        addStaticBox(scene, center, size.x, size.y, size.z, { sound: "solid" });
    }

    // Hide the old blocks (the logos stay parented to it). Its physics body is replaced by the
    // per-step boxes above, which follow the steps' shapes more closely. The scene loader doesn't
    // set mesh.physicsImpostor, so look the body up through the physics engine.
    podium.isVisible = false;
    (podium.physicsImpostor ?? scene.getPhysicsEngine()?.getImpostorForPhysicsObject(podium))?.dispose();
    podium.physicsImpostor = null;

    for (const child of podium.getChildMeshes()) {
        const name = child.name.toLowerCase();
        if (name.includes("linkedin")) {
            child.material = createToyMaterial(scene, `toy-logo-${name}`, PALETTE.logoBlue, { roughness: 0.4, clearCoat: 0.6 });
        } else if (name.includes("stlmesh")) {
            child.material = createToyMaterial(scene, "toy-logo-sakura", PALETTE.logoSakura, { roughness: 0.45, clearCoat: 0.5 });
        }
    }
}

function createNumberMaterial(scene: BABYLON.Scene, place: number): BABYLON.StandardMaterial {
    const size = 256;
    const texture = new BABYLON.DynamicTexture(`toy-podium-number-${place}-texture`, { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, size, size);
    context.fillStyle = PALETTE.numbers;
    context.font = `900 ${size * 0.8}px "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(place), size / 2, size * 0.54);
    texture.update();

    const material = new BABYLON.StandardMaterial(`toy-podium-number-${place}`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.15, 0.15, 0.18);
    material.zOffset = -2;
    return material;
}

// ==================================================================== Roads

/** The road network (see roads.ts), with its cobblestone material and edge pebbles. */
function createRoads(scene: BABYLON.Scene): void {
    const random = createRandom(42);
    const pebbles = PALETTE.edgePebbles.map((hex, i) => {
        const pebble = createLumpyBall(`road-edge-pebble-${i}`, scene, random, 1.6, 2);
        pebble.material = createToyMaterial(scene, `toy-road-edge-${i}`, hex, { roughness: 0.7, clearCoat: 0.15 });
        return pebble;
    });
    createRoadNetwork(scene, createCobbleMaterial(scene), pebbles);
}

/**
 * Cobblestone texture generated on a canvas: a colour map with stones in a few tones and darker
 * mortar, plus a matching normal map so the stones look raised with rounded edges.
 */
function createCobbleMaterial(scene: BABYLON.Scene): BABYLON.PBRMaterial {
    const size = 512;
    const rows = 4;
    const columns = 3;
    const cellWidth = size / columns;
    const cellHeight = size / rows;
    const mortar = 7;
    const cornerRadius = 22;
    const bevel = 20;
    const random = createRandom(9);

    const stoneColors = PALETTE.slabs.map((hex) => BABYLON.Color3.FromHexString(hex));
    const mortarColor = BABYLON.Color3.FromHexString(PALETTE.mortar);
    const cellTone: number[] = [];
    const cellShade: number[] = [];
    for (let i = 0; i < rows * columns; i++) {
        cellTone.push(Math.floor(random() * stoneColors.length));
        cellShade.push(0.94 + (random() * 0.1));
    }

    const heights = new Float32Array(size * size);
    const colorTexture = new BABYLON.DynamicTexture("toy-cobble-color", { width: size, height: size }, scene, true);
    const colorContext = colorTexture.getContext() as CanvasRenderingContext2D;
    const colorImage = colorContext.createImageData(size, size);

    for (let y = 0; y < size; y++) {
        const row = Math.floor(y / cellHeight);
        const shift = (row % 2) * (cellWidth / 2);
        for (let x = 0; x < size; x++) {
            const shiftedX = (x + shift) % size;
            const column = Math.floor(shiftedX / cellWidth);
            // Rounded-rectangle distance from the stone's edge (positive inside the stone).
            const qx = (cellWidth / 2) - (mortar / 2) - Math.abs(shiftedX - ((column + 0.5) * cellWidth));
            const qy = (cellHeight / 2) - (mortar / 2) - Math.abs(y - ((row + 0.5) * cellHeight));
            let distance = Math.min(qx, qy);
            if (qx < cornerRadius && qy < cornerRadius) {
                distance = cornerRadius - Math.hypot(cornerRadius - qx, cornerRadius - qy);
            }

            const grain = (Math.sin(x * 0.9) * Math.sin(y * 1.3) * 0.5) + (random() - 0.5);
            const height = distance <= 0 ? 0 : smoothStep(0, bevel, distance) + (grain * 0.015);
            heights[(y * size) + x] = height;

            const cell = (row * columns) + column;
            const stone = stoneColors[cellTone[cell]];
            const shade = distance <= 0 ? 1 : cellShade[cell] * (0.9 + (0.1 * smoothStep(0, bevel, distance))) + (grain * 0.02);
            const base = distance <= 0 ? mortarColor : stone;
            const offset = ((y * size) + x) * 4;
            colorImage.data[offset] = clampByte(base.r * 255 * shade);
            colorImage.data[offset + 1] = clampByte(base.g * 255 * shade);
            colorImage.data[offset + 2] = clampByte(base.b * 255 * shade);
            colorImage.data[offset + 3] = 255;
        }
    }
    colorContext.putImageData(colorImage, 0, 0);
    colorTexture.update();

    const normalTexture = new BABYLON.DynamicTexture("toy-cobble-normal", { width: size, height: size }, scene, true);
    const normalContext = normalTexture.getContext() as CanvasRenderingContext2D;
    const normalImage = normalContext.createImageData(size, size);
    const strength = 6;
    const heightAt = (x: number, y: number) => heights[(((y + size) % size) * size) + ((x + size) % size)];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * strength;
            const ny = (heightAt(x, y - 1) - heightAt(x, y + 1)) * strength;
            const length = Math.hypot(nx, ny, 1);
            const offset = ((y * size) + x) * 4;
            normalImage.data[offset] = clampByte(((nx / length) * 0.5 + 0.5) * 255);
            normalImage.data[offset + 1] = clampByte(((ny / length) * 0.5 + 0.5) * 255);
            normalImage.data[offset + 2] = clampByte(((1 / length) * 0.5 + 0.5) * 255);
            normalImage.data[offset + 3] = 255;
        }
    }
    normalContext.putImageData(normalImage, 0, 0);
    normalTexture.update();
    normalTexture.gammaSpace = false;

    [colorTexture, normalTexture].forEach((texture) => {
        texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
    });

    // Muted, slightly cool tint so the roads sit with the blue ground instead of glowing cream.
    const material = createToyMaterial(scene, "toy-road-cobbles", PALETTE.cobbleTint, { roughness: 0.78, clearCoat: 0.08 });
    material.albedoTexture = colorTexture;
    material.bumpTexture = normalTexture;
    return material;
}

function clampByte(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

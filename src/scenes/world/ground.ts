import * as BABYLON from "@babylonjs/core";

import { PLAYGROUND_LANES } from "./playground";
import { getRoadClearAreas } from "./roads";
import { addStaticSphere } from "../core/staticBodies";
import { addThinInstances, createLumpyBall, createRandom, createTemplate, createToyMaterial } from "../core/toyStyle";
import { GROUND_Y } from "../core/constants";

/**
 * Gives the flat ground some character without changing its shape: a soft play-mat texture, and
 * decorations scattered around (bushes, boulders, pebbles, fallen petals under the trees and toy
 * flowers).
 *
 * Everything is placed from a fixed seed, so the layout is the same on every visit, and kept clear
 * of gameplay objects (anything with a physics body, the roads, signs and the spawn area). The
 * bushes and boulders are solid.
 */

/** Decorations are scattered within this distance of the world origin. */
const SCATTER_RADIUS = 230;
/** Keep the area around the tank's spawn point clear. */
const SPAWN_CLEAR_RADIUS = 28;

const PALETTE = {
    mat: "#337CA0",
    matAlt: "#3884A8",
    matSeam: "#2B6D8E",
    matSeamLight: "#4A93B6",
    pebbles: ["#C9BFAE", "#A99F8F", "#DDD3C2"],
    petals: ["#F3C6D1", "#F8DCE3"],
    stem: "#5E8F6D",
    flowerCenter: "#D9A13B",
    flowers: ["#F3C6D1", "#F4EBDD", "#E9AFBF"],
    bushes: ["#6E9F7E", "#5B8C70", "#82B08F"],
    boulders: ["#B8B1A3", "#9C968A", "#CFC7B8"],
};

export type Area = { minX: number; maxX: number; minZ: number; maxZ: number };

const extraClearAreas: Area[] = [];

/** Keeps an area free of decorations (bushes, boulders, flowers), e.g. a minigame's playing field. Call before decorateGround. */
export function keepGroundClear(area: Area): void {
    extraClearAreas.push(area);
}

export function decorateGround(scene: BABYLON.Scene, treePositions: BABYLON.Vector3[]): void {
    try {
        restyleGroundMaterial(scene);
    } catch (error) {
        console.error("Ground restyle failed, keeping the original", error);
    }

    try {
        scatterDecorations(scene, treePositions);
    } catch (error) {
        console.error("Ground decorations failed", error);
    }
}

// ==================================================================== Play-mat ground

function restyleGroundMaterial(scene: BABYLON.Scene): void {
    const ground = scene.getMeshByName("ground");
    if (!ground) {
        return;
    }

    const size = 512;
    const tilesPerTexture = 2;
    const tileWorldSize = 30;
    const texture = new BABYLON.DynamicTexture("toy-ground-mat", { width: size, height: size }, scene, true);
    const context = texture.getContext() as CanvasRenderingContext2D;
    const tile = size / tilesPerTexture;

    // Checker of two close blues, like interlocking foam play-mat tiles.
    for (let ty = 0; ty < tilesPerTexture; ty++) {
        for (let tx = 0; tx < tilesPerTexture; tx++) {
            context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.mat : PALETTE.matAlt;
            context.fillRect(tx * tile, ty * tile, tile, tile);
        }
    }

    // Foam speckle.
    const random = createRandom(3);
    for (let i = 0; i < 2600; i++) {
        const light = random() > 0.5;
        context.fillStyle = light ? "rgba(255,255,255,0.06)" : "rgba(0,30,60,0.07)";
        const radius = 0.6 + (random() * 1.6);
        context.beginPath();
        context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
        context.fill();
    }

    // Embossed seams between tiles: a dark groove with a light edge next to it. Drawn on the
    // texture's edges as well so neighbouring repeats line up.
    for (let i = 0; i <= tilesPerTexture; i++) {
        const position = i * tile;
        context.fillStyle = PALETTE.matSeam;
        context.fillRect(position - 2, 0, 4, size);
        context.fillRect(0, position - 2, size, 4);
        context.fillStyle = PALETTE.matSeamLight;
        context.fillRect(position + 2, 0, 2, size);
        context.fillRect(0, position + 2, size, 2);
    }
    texture.update();
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 8;

    ground.computeWorldMatrix(true);
    const extent = ground.getBoundingInfo().boundingBox.extendSizeWorld;
    texture.uScale = (extent.x * 2) / (tileWorldSize * tilesPerTexture);
    texture.vScale = (extent.z * 2) / (tileWorldSize * tilesPerTexture);

    // Plain (non-PBR) material like the original, so the ground keeps the same brightness.
    const material = new BABYLON.StandardMaterial("toy-ground", scene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
    ground.material = material;
}

// ==================================================================== Decorations

function scatterDecorations(scene: BABYLON.Scene, treePositions: BABYLON.Vector3[]): void {
    const random = createRandom(2024);
    const blocked = collectBlockedAreas(scene);
    const isFree = (x: number, z: number, margin: number) => {
        if (Math.hypot(x, z) < SPAWN_CLEAR_RADIUS + margin) {
            return false;
        }
        return !blocked.some((area) => x > area.minX - margin && x < area.maxX + margin && z > area.minZ - margin && z < area.maxZ + margin);
    };
    const randomSpot = (margin: number, minDistance = SPAWN_CLEAR_RADIUS): BABYLON.Vector2 | null => {
        for (let attempt = 0; attempt < 40; attempt++) {
            const angle = random() * Math.PI * 2;
            const distance = minDistance + (Math.sqrt(random()) * (SCATTER_RADIUS - minDistance));
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            if (isFree(x, z, margin)) {
                return new BABYLON.Vector2(x, z);
            }
        }
        return null;
    };

    // ---- Bushes first (they are solid, so later decorations avoid them).
    const bushTemplates = PALETTE.bushes.map((hex, i) => createTemplate(
        createLumpyBall(`deco-bush-puff-${i}`, scene, random),
        createToyMaterial(scene, `toy-bush-${i}`, hex, { roughness: 0.6, clearCoat: 0.15 }),
    ));
    for (let i = 0; i < 20; i++) {
        const spot = randomSpot(9, 45);
        if (!spot) {
            continue;
        }

        const bush = new BABYLON.TransformNode(`deco-bush-${i}`, scene);
        bush.position.set(spot.x, GROUND_Y, spot.y);
        bush.rotation.y = random() * Math.PI * 2;
        const puffCount = 3 + Math.floor(random() * 3);
        for (let p = 0; p < puffCount; p++) {
            const angle = (p / puffCount) * Math.PI * 2;
            const radius = 2.2 + (random() * 1.3);
            const offset = p === 0 ? 0 : 1.8 + (random() * 0.8);
            const puff = bushTemplates[Math.floor(random() * bushTemplates.length)].createInstance(`deco-bush-${i}-${p}`);
            puff.parent = bush;
            puff.position.set(Math.cos(angle) * offset, radius * 0.75, Math.sin(angle) * offset);
            puff.scaling.set(radius, radius * 0.85, radius);
            puff.rotation.y = random() * Math.PI * 2;
            puff.isPickable = false;
        }

        // A simple solid sphere so the tank bumps into the bush instead of driving through it.
        addStaticSphere(scene, new BABYLON.Vector3(spot.x, GROUND_Y + 2, spot.y), 3.5, { sound: "bush" });
        blocked.push({ minX: spot.x - 4, maxX: spot.x + 4, minZ: spot.y - 4, maxZ: spot.y + 4 });
    }

    // ---- Boulders: big solid rocks to steer around.
    const boulderMaterials = PALETTE.boulders.map((hex, i) => createToyMaterial(scene, `toy-boulder-${i}`, hex, { roughness: 0.7, clearCoat: 0.15 }));
    for (let i = 0; i < 10; i++) {
        const spot = randomSpot(8, 50);
        if (!spot) {
            continue;
        }
        const size = 2.6 + (random() * 2.6);
        const boulder = createLumpyBall(`deco-boulder-${i}`, scene, random, 2.2, 2);
        boulder.material = boulderMaterials[i % boulderMaterials.length];
        boulder.scaling.set(size * (1 + (random() * 0.4)), size * 0.75, size);
        boulder.rotation.y = random() * Math.PI * 2;
        boulder.position.set(spot.x, GROUND_Y + (size * 0.45), spot.y);
        boulder.isPickable = false;

        addStaticSphere(scene, boulder.position, size, { sound: "rock" });
        const margin = size + 1;
        blocked.push({ minX: spot.x - margin, maxX: spot.x + margin, minZ: spot.y - margin, maxZ: spot.y + margin });
    }

    // ---- Pebbles, alone and in small groups.
    const pebbleMeshes = PALETTE.pebbles.map((hex, i) => {
        const pebble = createLumpyBall(`deco-pebble-${i}`, scene, random, 1.8, 2);
        pebble.material = createToyMaterial(scene, `toy-pebble-${i}`, hex, { roughness: 0.65, clearCoat: 0.2 });
        return pebble;
    });
    const pebbleMatrices: BABYLON.Matrix[][] = pebbleMeshes.map(() => []);
    for (let group = 0; group < 95; group++) {
        const spot = randomSpot(2);
        if (!spot) {
            continue;
        }
        const count = 1 + Math.floor(random() * 4);
        for (let i = 0; i < count; i++) {
            const x = spot.x + ((random() - 0.5) * 4);
            const z = spot.y + ((random() - 0.5) * 4);
            if (!isFree(x, z, 1)) {
                continue;
            }
            const size = 0.5 + (random() * 0.9);
            pebbleMatrices[Math.floor(random() * pebbleMeshes.length)].push(BABYLON.Matrix.Compose(
                new BABYLON.Vector3(size, size * 0.6, size * (0.8 + (random() * 0.4))),
                BABYLON.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, 0, 0),
                new BABYLON.Vector3(x, GROUND_Y + (size * 0.15), z),
            ));
        }
    }
    pebbleMeshes.forEach((mesh, i) => addThinInstances(mesh, pebbleMatrices[i]));

    // ---- Fallen petals around each tree.
    const petalMeshes = PALETTE.petals.map((hex, i) => {
        const petal = BABYLON.MeshBuilder.CreateCylinder(`ground-petal-${i}`, { diameter: 1, height: 0.06, tessellation: 10 }, scene);
        petal.material = createToyMaterial(scene, `toy-ground-petal-${i}`, hex, { roughness: 0.6 });
        return petal;
    });
    const petalMatrices: BABYLON.Matrix[][] = petalMeshes.map(() => []);
    for (const tree of treePositions) {
        for (let i = 0; i < 70; i++) {
            const angle = random() * Math.PI * 2;
            // More petals near the trunk, thinning out towards the canopy's edge.
            const distance = 3.5 + (Math.pow(random(), 0.7) * 13);
            const x = tree.x + (Math.cos(angle) * distance);
            const z = tree.z + (Math.sin(angle) * distance);
            const size = 0.6 + (random() * 0.5);
            petalMatrices[Math.floor(random() * petalMeshes.length)].push(BABYLON.Matrix.Compose(
                new BABYLON.Vector3(size * 1.6, 1, size),
                BABYLON.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2),
                new BABYLON.Vector3(x, GROUND_Y + 0.03 + (random() * 0.02), z),
            ));
        }
    }
    petalMeshes.forEach((mesh, i) => addThinInstances(mesh, petalMatrices[i]));

    // ---- Toy flowers in little clusters.
    const flowerMeshes = PALETTE.flowers.map((hex, i) => createFlowerMesh(scene, `deco-flower-${i}`, hex));
    const flowerMatrices: BABYLON.Matrix[][] = flowerMeshes.map(() => []);
    for (let cluster = 0; cluster < 26; cluster++) {
        const spot = randomSpot(4);
        if (!spot) {
            continue;
        }
        const colorIndex = Math.floor(random() * flowerMeshes.length);
        const count = 4 + Math.floor(random() * 5);
        for (let i = 0; i < count; i++) {
            const x = spot.x + ((random() - 0.5) * 6);
            const z = spot.y + ((random() - 0.5) * 6);
            if (!isFree(x, z, 1)) {
                continue;
            }
            const size = 1.3 + (random() * 0.6);
            flowerMatrices[random() < 0.75 ? colorIndex : Math.floor(random() * flowerMeshes.length)].push(BABYLON.Matrix.Compose(
                new BABYLON.Vector3(size, size * (0.8 + (random() * 0.5)), size),
                BABYLON.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, (random() - 0.5) * 0.25, (random() - 0.5) * 0.25),
                new BABYLON.Vector3(x, GROUND_Y, z),
            ));
        }
    }
    flowerMeshes.forEach((mesh, i) => addThinInstances(mesh, flowerMatrices[i]));
}

/**
 * Areas to keep clear: every visible object standing on the ground (buildings, props, trees,
 * podium, signs, roads, targets, bricks...) plus invisible ones that have a physics body. The ground
 * itself and the tank are ignored.
 */
function collectBlockedAreas(scene: BABYLON.Scene): Area[] {
    const tank = scene.getMeshByName("tank_holder");
    // Roads are handled above with areas along their length (their bounding boxes would cover far
    // too much).
    const ignored = /^(ground|tank_holder|splatter\d*|ball|deco-|ground-petal|road-)/;
    // The ramps' run-up lanes and the roads stay clear too.
    const areas: Area[] = [...PLAYGROUND_LANES, ...getRoadClearAreas(), ...extraClearAreas].map((lane) => ({ ...lane }));
    for (const mesh of scene.meshes) {
        if (!mesh.isEnabled() || ignored.test(mesh.name) || (tank && mesh.isDescendantOf(tank))) {
            continue;
        }
        if (!mesh.isVisible && !mesh.physicsImpostor) {
            continue;
        }

        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        const width = box.maximumWorld.x - box.minimumWorld.x;
        const depth = box.maximumWorld.z - box.minimumWorld.z;
        if (width > 1000 || depth > 1000) {
            continue;
        }
        areas.push({ minX: box.minimumWorld.x, maxX: box.maximumWorld.x, minZ: box.minimumWorld.z, maxZ: box.maximumWorld.z });
    }
    return areas;
}

/** A small toy flower: stem, five rounded petals and a centre, merged into one mesh. */
function createFlowerMesh(scene: BABYLON.Scene, name: string, petalHex: string): BABYLON.Mesh {
    const stemMaterial = createToyMaterial(scene, `${name}-stem`, PALETTE.stem, { roughness: 0.6 });
    const petalMaterial = createToyMaterial(scene, `${name}-petals`, petalHex, { roughness: 0.5, clearCoat: 0.3 });
    const centerMaterial = createToyMaterial(scene, `${name}-center`, PALETTE.flowerCenter, { roughness: 0.45, clearCoat: 0.3 });

    const stem = BABYLON.MeshBuilder.CreateCylinder(`${name}-stem`, { diameter: 0.16, height: 1.4, tessellation: 6 }, scene);
    stem.position.y = 0.7;
    stem.material = stemMaterial;

    const parts: BABYLON.Mesh[] = [stem];
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const petal = BABYLON.MeshBuilder.CreateSphere(`${name}-petal-${i}`, { diameter: 0.5, segments: 6 }, scene);
        petal.scaling.set(1, 0.4, 1);
        petal.position.set(Math.cos(angle) * 0.3, 1.45, Math.sin(angle) * 0.3);
        petal.material = petalMaterial;
        parts.push(petal);
    }

    const center = BABYLON.MeshBuilder.CreateSphere(`${name}-center`, { diameter: 0.34, segments: 6 }, scene);
    center.position.y = 1.5;
    center.material = centerMaterial;
    parts.push(center);

    const flower = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    if (!flower) {
        throw new Error("Failed to build flower mesh");
    }
    flower.name = name;
    return flower;
}

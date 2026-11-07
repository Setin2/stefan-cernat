import * as BABYLON from "@babylonjs/core";

import { addThinInstances, buildMesh, createLumpyBall, createRandom, createRoundedBox, createToyMaterial, pushOrientedTriangle } from "./toyStyle";

/**
 * Restyles static landmarks from the editor scene to match the toy look: the social-media podium,
 * the flat road slabs and the signs lying on the ground. The original meshes keep their role (the podium keeps its physics body
 * and the logos parented to it), they are only hidden and replaced by toy-style geometry with the
 * same footprint and heights.
 */

const GROUND_Y = -0.5;

const PALETTE = {
    podiumBody: "#E8DCC6",
    first: "#C9A35B",
    second: "#AEB8C2",
    third: "#B07A52",
    numbers: "#344B63",
    logoBlue: "#456F99",
    logoSakura: "#E8869F",
    slabs: ["#D8CBB4", "#CFC1A8", "#E0D4BF", "#C9B79C"],
    mortar: "#8F8372",
    edgePebbles: ["#9C9282", "#B3A893"],
    signPlate: "#344B63",
    signRim: "#E8DCC6",
};

export function restyleLandmarks(scene: BABYLON.Scene): void {
    try {
        restylePodium(scene);
    } catch (error) {
        console.error("Podium restyle failed, keeping the original", error);
    }

    try {
        restyleRoads(scene);
    } catch (error) {
        console.error("Road restyle failed, keeping the original", error);
    }

    try {
        restyleSigns(scene);
    } catch (error) {
        console.error("Sign restyle failed, keeping the originals", error);
    }
}

// ==================================================================== Podium

/**
 * The podium mesh is three boxes side by side (2nd, 1st, 3rd place). These are their extents in
 * the podium's local space, taken from its geometry; local +Z is up and local +Y is the front.
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
    }

    // Hide the old blocks but keep the physics body and the logos parented to it.
    podium.isVisible = false;

    for (const child of podium.getChildMeshes()) {
        const name = child.name.toLowerCase();
        if (name.includes("linkedin") || name.includes("twitter")) {
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

/**
 * Each road mesh is a few flat, irregular slabs. Every slab's outline is read back from the mesh
 * (in world space) and rebuilt as a raised paving slab with bevelled edges.
 */
function restyleRoads(scene: BABYLON.Scene): void {
    const roads = scene.meshes.filter((mesh) => /^road\d*$/i.test(mesh.name));
    if (!roads.length) {
        return;
    }

    const random = createRandom(42);
    const cobbles = createCobbleMaterial(scene);
    const edgeMeshes = PALETTE.edgePebbles.map((hex, i) => {
        const pebble = createLumpyBall(`road-edge-pebble-${i}`, scene, random, 1.6, 2);
        pebble.material = createToyMaterial(scene, `toy-road-edge-${i}`, hex, { roughness: 0.7, clearCoat: 0.15 });
        return pebble;
    });
    const edgeMatrices: BABYLON.Matrix[][] = edgeMeshes.map(() => []);

    roads.forEach((road, roadIndex) => {
        const outlines = getSlabOutlines(road);
        if (!outlines.length) {
            return;
        }

        outlines.forEach((outline, slabIndex) => {
            // Only slightly raised: the tank drives over these without physics, so a tall slab
            // would swallow its tracks.
            const slab = createSlabMesh(`road-slab-${roadIndex}-${slabIndex}`, outline, GROUND_Y - 0.2, GROUND_Y + 0.15, 0.12, scene);
            slab.material = cobbles;
            slab.isPickable = false;

            // A border of small pebbles around each slab.
            const center = outline.reduce((sum, p) => sum.addInPlace(p), new BABYLON.Vector2(0, 0)).scaleInPlace(1 / outline.length);
            for (let i = 0; i < outline.length; i++) {
                const start = outline[i];
                const end = outline[(i + 1) % outline.length];
                const edgeLength = BABYLON.Vector2.Distance(start, end);
                const steps = Math.max(1, Math.round(edgeLength / 1.25));
                for (let k = 0; k < steps; k++) {
                    const point = BABYLON.Vector2.Lerp(start, end, (k + 0.5) / steps);
                    const outward = point.subtract(center).normalize();
                    const size = 0.45 + (random() * 0.35);
                    const matrix = BABYLON.Matrix.Compose(
                        new BABYLON.Vector3(size, size * 0.55, size),
                        BABYLON.Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, 0, 0),
                        new BABYLON.Vector3(point.x + (outward.x * 0.45), GROUND_Y + 0.05, point.y + (outward.y * 0.45)),
                    );
                    edgeMatrices[Math.floor(random() * edgeMeshes.length)].push(matrix);
                }
            }
        });

        road.setEnabled(false);
    });

    edgeMeshes.forEach((mesh, i) => addThinInstances(mesh, edgeMatrices[i]));
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

    const material = createToyMaterial(scene, "toy-road-cobbles", "#FFFFFF", { roughness: 0.72, clearCoat: 0.12 });
    material.albedoTexture = colorTexture;
    material.bumpTexture = normalTexture;
    return material;
}

function smoothStep(edge0: number, edge1: number, value: number): number {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - (2 * t));
}

function clampByte(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Splits a mesh into its connected pieces and returns each piece's outline on the ground (convex
 * hull of its vertices in world X/Z).
 */
function getSlabOutlines(mesh: BABYLON.AbstractMesh): BABYLON.Vector2[][] {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    if (!positions || !indices) {
        return [];
    }

    mesh.computeWorldMatrix(true);
    const world = mesh.getWorldMatrix();
    const vertexCount = positions.length / 3;
    const worldPoints: BABYLON.Vector2[] = [];
    const point = new BABYLON.Vector3();
    for (let i = 0; i < vertexCount; i++) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(positions[i * 3], positions[(i * 3) + 1], positions[(i * 3) + 2], world, point);
        worldPoints.push(new BABYLON.Vector2(point.x, point.z));
    }

    // Union-find over triangles; vertices at the same spot (top/bottom, split normals) are joined too.
    const parent = Array.from({ length: vertexCount }, (_, i) => i);
    const find = (i: number): number => {
        while (parent[i] !== i) {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        return i;
    };
    const union = (a: number, b: number) => {
        parent[find(a)] = find(b);
    };
    for (let t = 0; t < indices.length; t += 3) {
        union(indices[t], indices[t + 1]);
        union(indices[t + 1], indices[t + 2]);
    }
    const byPosition = new Map<string, number>();
    worldPoints.forEach((p, i) => {
        const key = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        const existing = byPosition.get(key);
        if (existing === undefined) {
            byPosition.set(key, i);
        } else {
            union(i, existing);
        }
    });

    const groups = new Map<number, BABYLON.Vector2[]>();
    worldPoints.forEach((p, i) => {
        const root = find(i);
        const group = groups.get(root) ?? [];
        group.push(p);
        groups.set(root, group);
    });

    return Array.from(groups.values())
        .map(convexHull)
        .filter((hull) => hull.length >= 3);
}

/** Andrew's monotone chain; returns the hull counter-clockwise in (x, z). */
function convexHull(points: BABYLON.Vector2[]): BABYLON.Vector2[] {
    const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y));
    const cross = (o: BABYLON.Vector2, a: BABYLON.Vector2, b: BABYLON.Vector2) => ((a.x - o.x) * (b.y - o.y)) - ((a.y - o.y) * (b.x - o.x));
    const lower: BABYLON.Vector2[] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-6) {
            lower.pop();
        }
        lower.push(p);
    }
    const upper: BABYLON.Vector2[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-6) {
            upper.pop();
        }
        upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

/**
 * Extrudes a convex outline into a slab between `bottomY` and `topY`, with a bevel of size
 * `bevel` around the top edge.
 */
function createSlabMesh(name: string, outline: BABYLON.Vector2[], bottomY: number, topY: number, bevel: number, scene: BABYLON.Scene): BABYLON.Mesh {
    const center = outline.reduce((sum, p) => sum.addInPlace(p), new BABYLON.Vector2(0, 0)).scaleInPlace(1 / outline.length);
    const inset = outline.map((p) => {
        const offset = p.subtract(center);
        const length = offset.length();
        return length > bevel ? center.add(offset.scale((length - bevel) / length)) : center.clone();
    });
    const outward = outline.map((p) => {
        const offset = p.subtract(center);
        return offset.normalize();
    });

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    // Planar world-space UVs so the cobble pattern has the same scale on every slab.
    const uvScale = 1 / 8;
    const addVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number): number => {
        positions.push(x, y, z);
        uvs.push(x * uvScale, z * uvScale);
        const length = Math.hypot(nx, ny, nz);
        normals.push(nx / length, ny / length, nz / length);
        return (positions.length / 3) - 1;
    };

    // Top face (fan around the center).
    const topCenter = addVertex(center.x, topY, center.y, 0, 1, 0);
    const topRing = inset.map((p) => addVertex(p.x, topY, p.y, 0, 1, 0));
    for (let i = 0; i < topRing.length; i++) {
        pushOrientedTriangle(indices, positions, normals, topCenter, topRing[i], topRing[(i + 1) % topRing.length]);
    }

    // Bevel and side walls, with soft normals so the edge catches the light.
    const shoulderY = topY - bevel;
    const count = outline.length;
    for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        const bevelTopA = addVertex(inset[i].x, topY, inset[i].y, outward[i].x * 0.6, 1, outward[i].y * 0.6);
        const bevelTopB = addVertex(inset[next].x, topY, inset[next].y, outward[next].x * 0.6, 1, outward[next].y * 0.6);
        const shoulderA = addVertex(outline[i].x, shoulderY, outline[i].y, outward[i].x, 0.6, outward[i].y);
        const shoulderB = addVertex(outline[next].x, shoulderY, outline[next].y, outward[next].x, 0.6, outward[next].y);
        pushOrientedTriangle(indices, positions, normals, bevelTopA, shoulderA, shoulderB);
        pushOrientedTriangle(indices, positions, normals, bevelTopA, shoulderB, bevelTopB);

        const wallTopA = addVertex(outline[i].x, shoulderY, outline[i].y, outward[i].x, 0.15, outward[i].y);
        const wallTopB = addVertex(outline[next].x, shoulderY, outline[next].y, outward[next].x, 0.15, outward[next].y);
        const wallBottomA = addVertex(outline[i].x, bottomY, outline[i].y, outward[i].x, 0, outward[i].y);
        const wallBottomB = addVertex(outline[next].x, bottomY, outline[next].y, outward[next].x, 0, outward[next].y);
        pushOrientedTriangle(indices, positions, normals, wallTopA, wallBottomA, wallBottomB);
        pushOrientedTriangle(indices, positions, normals, wallTopA, wallBottomB, wallTopB);
    }

    return buildMesh(name, positions, normals, indices, scene, uvs);
}

// ==================================================================== Signs

/**
 * Signs lying on the ground: extruded 3D text, and the Fruit Factory description (white text on a
 * transparent image). Each gets a raised navy plate with a sand rim underneath, like a toy name
 * plate, and the 3D letters get a glossy cream plastic finish.
 */
function restyleSigns(scene: BABYLON.Scene): void {
    const plate = createToyMaterial(scene, "toy-sign-plate", PALETTE.signPlate, { roughness: 0.5, clearCoat: 0.35 });
    const rim = createToyMaterial(scene, "toy-sign-rim", PALETTE.signRim, { roughness: 0.5, clearCoat: 0.3 });

    // The description is a flat textured plane lying on the ground.
    const description = scene.getMeshByName("ffdescription");
    if (description) {
        description.computeWorldMatrix(true);
        const world = description.getWorldMatrix();
        const axisX = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(1, 0, 0), world);
        const axisY = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 1, 0), world);
        const center = description.getAbsolutePosition();
        // Rotating a box by `yaw` turns its local X into (cos yaw, 0, -sin yaw).
        const yaw = Math.atan2(-axisX.z, axisX.x);
        createSignPlate(scene, "sign-plate-ffdescription", center.x, center.z, yaw, axisX.length() + 5, axisY.length() + 5, plate, rim);
    }
}

function createSignPlate(scene: BABYLON.Scene, name: string, x: number, z: number, yaw: number, width: number, depth: number, plate: BABYLON.Material, rim: BABYLON.Material): void {
    const plateHeight = 0.5;
    const plateTop = GROUND_Y + 0.24;
    const top = createRoundedBox(name, width, plateHeight, depth, 0.25, scene, 3);
    top.material = plate;
    top.position.set(x, plateTop - (plateHeight / 2), z);
    top.rotation.y = yaw;

    const border = createRoundedBox(`${name}-rim`, width + 1.6, plateHeight, depth + 1.6, 0.25, scene, 3);
    border.material = rim;
    border.position.set(x, plateTop - 0.08 - (plateHeight / 2), z);
    border.rotation.y = yaw;

    [top, border].forEach((mesh) => {
        mesh.isPickable = false;
    });
}

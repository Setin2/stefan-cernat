import * as BABYLON from "@babylonjs/core";

import { addThinInstances, buildMesh, createLumpyBall, createRandom, createRoundedBox, createToyMaterial, pushOrientedTriangle } from "../core/toyStyle";
import { GROUND_Y } from "../core/constants";

/**
 * Rebuilds the Fruit Factory corner (the desk with the PC, and the C# trophy) as a toy desk setup.
 *
 * Every piece of the original desk model is replaced by a toy version built in code at the same
 * place and size: desk, monitor (reusing the Fruit Factory screenshot), PC tower, keyboard, mouse
 * and speakers, plus a few props. The originals are hidden; the invisible "fruit factory" box keeps
 * doing the physics.
 */

const PALETTE = {
    deskTop: "#E2B57E",
    deskEdge: "#B9834F",
    deskFrame: "#4F6F8F",
    drawer: "#E8DCC6",
    accent: "#E8869F",
    navy: "#344B63",
    slate: "#4F6F8F",
    sand: "#E8DCC6",
    cream: "#F4EBDD",
    coneDark: "#2A2C30",
    powerLight: "#7CF0B0",
    coffee: "#6B4430",
    pot: "#C9734F",
    soil: "#5E4436",
    leaves: ["#6E9F7E", "#5B8C70", "#82B08F"],
    title: "#F4EBDD",
    trophy: "#C9A35B",
};

/** Horizontal frame aligned with the desk: x to the desk's right, z towards its front, y up. */
type DeskFrame = {
    yaw: number;
    right: BABYLON.Vector3;
    forward: BABYLON.Vector3;
    toWorld: (x: number, y: number, z: number) => BABYLON.Vector3;
};

type FrameBox = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

type Materials = ReturnType<typeof createMaterials>;

export function restyleFruitFactory(scene: BABYLON.Scene): void {
    try {
        restyleDesk(scene);
    } catch (error) {
        console.error("Fruit Factory desk restyle failed", error);
    }

    try {
        restyleTrophy(scene);
    } catch (error) {
        console.error("C# trophy restyle failed, keeping the original", error);
    }
}

function createMaterials(scene: BABYLON.Scene) {
    const toy = (name: string, hex: string, roughness = 0.45, clearCoat = 0.4, metallic = 0) =>
        createToyMaterial(scene, `toy-ff-${name}`, hex, { roughness, clearCoat, metallic });

    const glow = (name: string, hex: string) => {
        const material = new BABYLON.StandardMaterial(`toy-ff-${name}`, scene);
        material.disableLighting = true;
        material.emissiveColor = BABYLON.Color3.FromHexString(hex);
        return material;
    };

    return {
        deskTop: toy("desk-top", PALETTE.deskTop, 0.5, 0.5),
        deskEdge: toy("desk-edge", PALETTE.deskEdge, 0.5, 0.4),
        deskFrame: toy("desk-frame", PALETTE.deskFrame),
        drawer: toy("drawer", PALETTE.drawer, 0.5, 0.35),
        accent: toy("accent", PALETTE.accent, 0.4, 0.5),
        navy: toy("navy", PALETTE.navy, 0.45, 0.4),
        slate: toy("slate", PALETTE.slate, 0.45, 0.45),
        sand: toy("sand", PALETTE.sand, 0.45, 0.4),
        cream: toy("cream", PALETTE.cream, 0.4, 0.5),
        coneDark: toy("cone", PALETTE.coneDark, 0.7, 0.1),
        coffee: toy("coffee", PALETTE.coffee, 0.2, 0.6),
        pot: toy("pot", PALETTE.pot, 0.55, 0.3),
        soil: toy("soil", PALETTE.soil, 0.9, 0),
        leaves: PALETTE.leaves.map((hex, i) => toy(`leaves-${i}`, hex, 0.6, 0.15)),
        powerLight: glow("power-light", PALETTE.powerLight),
    };
}

function restyleDesk(scene: BABYLON.Scene): void {
    const factory = scene.getMeshByName("fruit factory");
    if (!factory) {
        return;
    }

    factory.computeWorldMatrix(true);
    const yaw = factory.rotationQuaternion ? factory.rotationQuaternion.toEulerAngles().y : factory.rotation.y;
    const right = new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const frame: DeskFrame = {
        yaw,
        right,
        forward,
        toWorld: (x, y, z) => right.scale(x).addInPlace(forward.scale(z)).addInPlaceFromFloats(0, y, 0),
    };

    // The desk parts are not children of the "fruit factory" physics box (they hang under a
    // separate node with the same name), so look them up by their own, unique names.
    const find = (name: string) => scene.getMeshByName(name);
    const table = find("Cube.001_table_0");
    if (!table) {
        console.warn("Fruit Factory desk not found, keeping the original");
        return;
    }

    const materials = createMaterials(scene);
    const deskBox = getFrameBox(table, frame);
    const deskTopY = deskBox.maxY;
    buildDesk(scene, frame, deskBox, materials);
    table.isVisible = false;

    // Each part is rebuilt independently; if one fails the original stays visible.
    const replace = (name: string, build: (mesh: BABYLON.AbstractMesh) => boolean) => {
        const mesh = find(name);
        if (!mesh) {
            return;
        }
        try {
            if (build(mesh)) {
                mesh.isVisible = false;
            }
        } catch (error) {
            console.error(`Failed to rebuild ${name}`, error);
        }
    };

    replace("monitor", (mesh) => buildMonitor(scene, frame, mesh, deskTopY, materials));
    replace("Cube.005_cpu_0", (mesh) => buildPcTower(scene, frame, getFrameBox(mesh, frame), deskTopY, materials));
    replace("Cube.004_keyboard_0", (mesh) => buildKeyboard(scene, frame, getFrameBox(mesh, frame), deskTopY, materials));
    replace("Cube.008_mouse_0", (mesh) => buildMouse(scene, frame, getFrameBox(mesh, frame), deskTopY, materials));
    replace("Cube.012_speakers_0", (mesh) => buildSpeakers(scene, frame, mesh, deskTopY, materials));

    buildProps(scene, frame, deskBox, materials);

    // The 3D "Fruit Factory" title.
    const title = scene.getTransformNodeByName("Text");
    title?.getChildMeshes().forEach((mesh) => {
        mesh.material = materials.cream;
    });
}

// ==================================================================== Desk

function buildDesk(scene: BABYLON.Scene, frame: DeskFrame, box: FrameBox, materials: Materials): void {
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    const topY = box.maxY;
    const floorY = GROUND_Y - 0.1;

    // Two-tone top: a darker edge band with a lighter, slightly inset surface on it.
    const edgeThickness = 1.1;
    const edge = createRoundedBox("ff-desk-edge", width, edgeThickness, depth, 0.5, scene);
    edge.material = materials.deskEdge;
    place(edge, frame, centerX, topY - 0.35 - (edgeThickness / 2), centerZ);

    const surface = createRoundedBox("ff-desk-surface", width - 0.5, 0.5, depth - 0.5, 0.22, scene, 3);
    surface.material = materials.deskTop;
    place(surface, frame, centerX, topY - 0.25, centerZ);

    const underTop = topY - 0.35 - edgeThickness;

    // Legs on the right (the robot sits at the right-hand side of the desk) and a rail between them.
    const legX = box.maxX - 1.4;
    const legSize = 1.6;
    const legHeight = underTop - floorY + 0.2;
    for (const side of [-1, 1]) {
        const leg = createRoundedBox(`ff-desk-leg-${side}`, legSize, legHeight, legSize, 0.5, scene);
        leg.material = materials.deskFrame;
        place(leg, frame, legX, floorY + (legHeight / 2), centerZ + (side * ((depth / 2) - 1.4)));

        // Little round feet
        const foot = BABYLON.MeshBuilder.CreateCylinder(`ff-desk-foot-${side}`, { diameter: 2.2, height: 0.5, tessellation: 20 }, scene);
        foot.material = materials.navy;
        place(foot, frame, legX, floorY + 0.25, centerZ + (side * ((depth / 2) - 1.4)));
    }
    const rail = createRoundedBox("ff-desk-rail", 0.9, 0.9, depth - 2.8, 0.3, scene);
    rail.material = materials.deskFrame;
    place(rail, frame, legX, floorY + 1.8, centerZ);

    // Drawer unit on the left.
    const unitWidth = Math.min(8, width * 0.3);
    const unitHeight = underTop - floorY + 0.2;
    const unitX = box.minX + (unitWidth / 2) + 0.6;
    const unitDepth = depth - 1.6;
    const unit = createRoundedBox("ff-desk-drawers", unitWidth, unitHeight, unitDepth, 0.55, scene);
    unit.material = materials.deskFrame;
    place(unit, frame, unitX, floorY + (unitHeight / 2), centerZ);

    const drawerCount = 3;
    const drawerGap = 0.45;
    const drawerHeight = (unitHeight - 1.2 - (drawerGap * (drawerCount - 1))) / drawerCount;
    const frontZ = centerZ + (unitDepth / 2);
    for (let i = 0; i < drawerCount; i++) {
        const y = floorY + 0.7 + (drawerHeight / 2) + (i * (drawerHeight + drawerGap));
        const drawer = createRoundedBox(`ff-desk-drawer-${i}`, unitWidth - 1.2, drawerHeight, 0.6, 0.22, scene, 3);
        drawer.material = materials.drawer;
        place(drawer, frame, unitX, y, frontZ + 0.1);

        const handle = createRoundedBox(`ff-desk-handle-${i}`, unitWidth * 0.35, 0.45, 0.5, 0.2, scene, 2);
        handle.material = materials.accent;
        place(handle, frame, unitX, y + (drawerHeight * 0.15), frontZ + 0.55);
    }

    // Back panel between the legs and the drawers.
    const panelLeft = unitX + (unitWidth / 2);
    const panelRight = legX - (legSize / 2);
    const panelHeight = Math.min(5, underTop - floorY - 1);
    const panel = createRoundedBox("ff-desk-panel", panelRight - panelLeft + 0.4, panelHeight, 0.6, 0.25, scene, 3);
    panel.material = materials.deskFrame;
    place(panel, frame, (panelLeft + panelRight) / 2, underTop - (panelHeight / 2) + 0.1, box.minZ + 1.2);
}

// ==================================================================== Monitor

/**
 * New monitor with a rounded bezel, stand and a glowing screen. The screen reuses the original
 * monitor's texture: the corners of the original screen face are found in its mesh together with
 * their texture coordinates, so the screenshot appears exactly as it did before.
 */
function buildMonitor(scene: BABYLON.Scene, frame: DeskFrame, monitor: BABYLON.AbstractMesh, deskTopY: number, materials: Materials): boolean {
    const texture = (monitor.material as BABYLON.PBRMaterial | null)?.albedoTexture ?? null;
    const screen = findScreenCorners(monitor, frame);
    if (!texture || !screen) {
        // Keep the original, just make the screen glow.
        const material = monitor.material;
        if (material instanceof BABYLON.PBRMaterial && material.albedoTexture) {
            material.emissiveTexture = material.albedoTexture;
            material.emissiveColor = new BABYLON.Color3(0.45, 0.45, 0.45);
        }
        return false;
    }

    const { corners, minX, maxX, minY, maxY, frontZ } = screen;
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const bezel = 0.9;
    const bezelDepth = 1.1;

    // Screen: a quad over the original screen with the original texture coordinates.
    const screenZ = frontZ + 0.12;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    corners.forEach((corner) => {
        const world = frame.toWorld(corner.x, corner.y, screenZ);
        positions.push(world.x, world.y, world.z);
        normals.push(frame.forward.x, 0, frame.forward.z);
        uvs.push(corner.u, corner.v);
    });
    const indices: number[] = [];
    pushOrientedTriangle(indices, positions, normals, 0, 1, 2);
    pushOrientedTriangle(indices, positions, normals, 0, 2, 3);
    const screenMesh = buildMesh("ff-monitor-screen", positions, normals, indices, scene, uvs);
    const screenMaterial = new BABYLON.StandardMaterial("toy-ff-screen", scene);
    screenMaterial.disableLighting = true;
    screenMaterial.emissiveTexture = texture;
    screenMesh.material = screenMaterial;
    screenMesh.isPickable = false;

    // Bezel, with a rounded back like a chunky toy monitor.
    const frameBox = createRoundedBox("ff-monitor-bezel", width + (bezel * 2), height + (bezel * 2), bezelDepth, 0.55, scene);
    frameBox.material = materials.navy;
    place(frameBox, frame, centerX, centerY, frontZ + 0.05 - (bezelDepth / 2));

    const back = createRoundedBox("ff-monitor-back", width * 0.6, height * 0.6, 1.6, 0.6, scene, 4, 0.85);
    back.material = materials.slate;
    place(back, frame, centerX, centerY, frontZ - bezelDepth - 0.6);

    // Power light on the bezel
    const led = BABYLON.MeshBuilder.CreateSphere("ff-monitor-led", { diameter: 0.35, segments: 8 }, scene);
    led.material = materials.powerLight;
    place(led, frame, maxX + (bezel * 0.5), minY - (bezel * 0.5), frontZ + 0.1);

    // Stand: neck and base on the desk.
    const bottomY = minY - bezel;
    const neckHeight = Math.max(0.5, bottomY - deskTopY + 0.3);
    const neck = createRoundedBox("ff-monitor-neck", 1.6, neckHeight, 1.0, 0.4, scene, 3);
    neck.material = materials.slate;
    place(neck, frame, centerX, deskTopY + (neckHeight / 2), frontZ - bezelDepth - 0.3);

    const base = createRoundedBox("ff-monitor-base", 6, 0.55, 3.4, 0.27, scene, 3);
    base.material = materials.navy;
    place(base, frame, centerX, deskTopY + 0.27, frontZ - bezelDepth - 0.3);

    return true;
}

type ScreenCorner = { x: number; y: number; u: number; v: number };

/**
 * Finds the original screen: the front-most vertices of the monitor whose texture coordinates are
 * in the screenshot part of the texture. Returns the four corners (in the desk frame) ordered
 * around the quad, each with its texture coordinate.
 */
function findScreenCorners(monitor: BABYLON.AbstractMesh, frame: DeskFrame) {
    const positions = monitor.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const uvData = monitor.getVerticesData(BABYLON.VertexBuffer.UVKind);
    if (!positions || !uvData) {
        return null;
    }

    monitor.computeWorldMatrix(true);
    const world = monitor.getWorldMatrix();
    const point = new BABYLON.Vector3();
    const vertices: (ScreenCorner & { z: number })[] = [];
    for (let i = 0; i < positions.length / 3; i++) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(positions[i * 3], positions[(i * 3) + 1], positions[(i * 3) + 2], world, point);
        vertices.push({
            x: BABYLON.Vector3.Dot(point, frame.right),
            y: point.y,
            z: BABYLON.Vector3.Dot(point, frame.forward),
            u: uvData[i * 2],
            v: uvData[(i * 2) + 1],
        });
    }

    // The screenshot lives in the lower-left part of the texture.
    const inScreenshot = vertices.filter((vertex) => vertex.u <= 0.3 && vertex.v <= 0.52);
    if (inScreenshot.length < 4) {
        return null;
    }
    const frontZ = Math.max(...inScreenshot.map((vertex) => vertex.z));
    const front = inScreenshot.filter((vertex) => vertex.z >= frontZ - 0.3);
    if (front.length < 4) {
        return null;
    }

    const minX = Math.min(...front.map((vertex) => vertex.x));
    const maxX = Math.max(...front.map((vertex) => vertex.x));
    const minY = Math.min(...front.map((vertex) => vertex.y));
    const maxY = Math.max(...front.map((vertex) => vertex.y));
    if (maxX - minX < 2 || maxY - minY < 2) {
        return null;
    }

    const nearest = (x: number, y: number): ScreenCorner => {
        let best = front[0];
        let bestDistance = Infinity;
        for (const vertex of front) {
            const distance = Math.hypot(vertex.x - x, vertex.y - y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = vertex;
            }
        }
        return { x, y, u: best.u, v: best.v };
    };

    return {
        corners: [nearest(minX, maxY), nearest(maxX, maxY), nearest(maxX, minY), nearest(minX, minY)],
        minX,
        maxX,
        minY,
        maxY,
        frontZ,
    };
}

// ==================================================================== Peripherals

function buildPcTower(scene: BABYLON.Scene, frame: DeskFrame, box: FrameBox, deskTopY: number, materials: Materials): boolean {
    // The original case is slightly tilted, so its measured box is a bit too big; shrink it so the
    // new case doesn't clip the speaker next to it.
    const width = box.maxX - box.minX - 1.6;
    const depth = box.maxZ - box.minZ - 0.8;
    const height = box.maxY - deskTopY;
    if (width < 1 || height < 1 || depth < 1) {
        return false;
    }
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    const frontZ = centerZ + (depth / 2);

    const body = createRoundedBox("ff-pc-body", width, height, depth, 0.6, scene);
    body.material = materials.slate;
    place(body, frame, centerX, deskTopY + (height / 2), centerZ);

    // Front panel with grille bars, a power button and a light.
    const panel = createRoundedBox("ff-pc-front", width - 0.6, height - 0.6, 0.4, 0.3, scene, 3);
    panel.material = materials.sand;
    place(panel, frame, centerX, deskTopY + (height / 2), frontZ - 0.05);

    const barCount = 4;
    for (let i = 0; i < barCount; i++) {
        const bar = createRoundedBox(`ff-pc-grille-${i}`, width - 1.6, 0.35, 0.3, 0.15, scene, 2);
        bar.material = materials.navy;
        place(bar, frame, centerX, deskTopY + 0.9 + (i * 0.7), frontZ + 0.2);
    }

    const button = BABYLON.MeshBuilder.CreateCylinder("ff-pc-button", { diameter: 1.0, height: 0.3, tessellation: 20 }, scene);
    button.material = materials.accent;
    button.rotation.x = Math.PI / 2;
    button.position.copyFrom(frame.toWorld(centerX, deskTopY + height - 1.2, frontZ + 0.2));
    button.rotation.y = frame.yaw;
    button.isPickable = false;

    const light = BABYLON.MeshBuilder.CreateSphere("ff-pc-light", { diameter: 0.32, segments: 8 }, scene);
    light.material = materials.powerLight;
    place(light, frame, centerX + (width * 0.28), deskTopY + height - 1.2, frontZ + 0.2);
    return true;
}

function buildKeyboard(scene: BABYLON.Scene, frame: DeskFrame, box: FrameBox, deskTopY: number, materials: Materials): boolean {
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    if (width < 1 || depth < 1) {
        return false;
    }
    const baseHeight = 0.55;
    const base = createRoundedBox("ff-keyboard-base", width, baseHeight, depth, 0.25, scene, 3);
    base.material = materials.navy;
    place(base, frame, (box.minX + box.maxX) / 2, deskTopY + (baseHeight / 2), (box.minZ + box.maxZ) / 2);

    addKeycaps(scene, frame, { ...box, maxY: deskTopY + baseHeight }, materials);
    return true;
}

/**
 * Rows of rounded keycaps, with W, A, S and D picked out in sakura pink (the tank's controls).
 */
function addKeycaps(scene: BABYLON.Scene, frame: DeskFrame, box: FrameBox, materials: Materials): void {
    const cap = createRoundedBox("ff-keycap", 1, 1, 1, 0.24, scene, 2);
    cap.material = materials.cream;
    const accentCap = createRoundedBox("ff-keycap-accent", 1, 1, 1, 0.24, scene, 2);
    accentCap.material = materials.accent;

    const columns = 14;
    const rows = 5;
    const margin = 0.4;
    const pitchX = ((box.maxX - box.minX) - (margin * 2)) / columns;
    const pitchZ = ((box.maxZ - box.minZ) - (margin * 2)) / rows;
    const capHeight = 0.4;
    const y = box.maxY + (capHeight / 2) - 0.08;
    const rotation = BABYLON.Quaternion.RotationYawPitchRoll(frame.yaw, 0, 0);
    // Rows go from the back of the keyboard (numbers) to the front (space bar).
    const accentKeys = new Set(["1,2", "2,1", "2,2", "2,3"]);
    const normal: BABYLON.Matrix[] = [];
    const accent: BABYLON.Matrix[] = [];

    for (let row = 0; row < rows; row++) {
        const z = box.minZ + margin + ((row + 0.5) * pitchZ);
        if (row === rows - 1) {
            normal.push(BABYLON.Matrix.Compose(
                new BABYLON.Vector3(pitchX * 5.8, capHeight, pitchZ * 0.75),
                rotation,
                frame.toWorld((box.minX + box.maxX) / 2, y, z),
            ));
            continue;
        }
        for (let column = 0; column < columns; column++) {
            const x = box.minX + margin + ((column + 0.5) * pitchX);
            const matrix = BABYLON.Matrix.Compose(
                new BABYLON.Vector3(pitchX * 0.78, capHeight, pitchZ * 0.75),
                rotation,
                frame.toWorld(x, y, z),
            );
            (accentKeys.has(`${row},${column}`) ? accent : normal).push(matrix);
        }
    }

    addThinInstances(cap, normal);
    addThinInstances(accentCap, accent);
}

function buildMouse(scene: BABYLON.Scene, frame: DeskFrame, box: FrameBox, deskTopY: number, materials: Materials): boolean {
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    const width = Math.max(1.1, box.maxX - box.minX);
    const depth = Math.max(1.6, box.maxZ - box.minZ);

    const pad = createRoundedBox("ff-mouse-pad", width + 3.2, 0.2, depth + 2.4, 0.1, scene, 2);
    pad.material = materials.accent;
    place(pad, frame, centerX, deskTopY + 0.1, centerZ);

    const body = BABYLON.MeshBuilder.CreateSphere("ff-mouse", { diameter: 1, segments: 16 }, scene);
    body.material = materials.sand;
    body.scaling.set(width, 0.75, depth);
    place(body, frame, centerX, deskTopY + 0.2, centerZ);

    const wheel = BABYLON.MeshBuilder.CreateCylinder("ff-mouse-wheel", { diameter: 0.4, height: 0.16, tessellation: 12 }, scene);
    wheel.material = materials.navy;
    wheel.rotation.z = Math.PI / 2;
    wheel.position.copyFrom(frame.toWorld(centerX, deskTopY + 0.58, centerZ - (depth * 0.22)));
    wheel.rotation.y = frame.yaw;
    wheel.isPickable = false;
    return true;
}

/** The original speakers are one mesh with a speaker on each side of the monitor. */
function buildSpeakers(scene: BABYLON.Scene, frame: DeskFrame, mesh: BABYLON.AbstractMesh, deskTopY: number, materials: Materials): boolean {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) {
        return false;
    }
    mesh.computeWorldMatrix(true);
    const world = mesh.getWorldMatrix();
    const point = new BABYLON.Vector3();
    const points: { x: number; z: number; y: number }[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, point);
        points.push({ x: BABYLON.Vector3.Dot(point, frame.right), y: point.y, z: BABYLON.Vector3.Dot(point, frame.forward) });
    }
    const middle = (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2;
    const groups = [points.filter((p) => p.x < middle), points.filter((p) => p.x >= middle)];

    groups.forEach((group, index) => {
        if (!group.length) {
            return;
        }
        const minX = Math.min(...group.map((p) => p.x));
        const maxX = Math.max(...group.map((p) => p.x));
        const minZ = Math.min(...group.map((p) => p.z));
        const maxZ = Math.max(...group.map((p) => p.z));
        const maxY = Math.max(...group.map((p) => p.y));
        const width = Math.max(1.5, maxX - minX);
        const depth = Math.max(1.5, maxZ - minZ);
        const height = Math.max(2, maxY - deskTopY);
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const body = createRoundedBox(`ff-speaker-${index}`, width, height, depth, 0.45, scene, 3);
        body.material = materials.navy;
        place(body, frame, centerX, deskTopY + (height / 2), centerZ);

        // Woofer (big) and tweeter (small) on the front.
        const cones = [
            { diameter: Math.min(width, height) * 0.62, y: deskTopY + (height * 0.36) },
            { diameter: Math.min(width, height) * 0.3, y: deskTopY + (height * 0.78) },
        ];
        cones.forEach((cone, coneIndex) => {
            if (cone.diameter < 0.3) {
                return;
            }
            const ring = BABYLON.MeshBuilder.CreateCylinder(`ff-speaker-ring-${index}-${coneIndex}`, { diameter: cone.diameter, height: 0.2, tessellation: 24 }, scene);
            ring.material = materials.cream;
            ring.rotation.x = Math.PI / 2;
            ring.position.copyFrom(frame.toWorld(centerX, cone.y, maxZ + 0.05));
            ring.rotation.y = frame.yaw;
            ring.isPickable = false;

            const inner = BABYLON.MeshBuilder.CreateCylinder(`ff-speaker-cone-${index}-${coneIndex}`, { diameter: cone.diameter * 0.62, height: 0.24, tessellation: 24 }, scene);
            inner.material = materials.coneDark;
            inner.rotation.x = Math.PI / 2;
            inner.position.copyFrom(frame.toWorld(centerX, cone.y, maxZ + 0.08));
            inner.rotation.y = frame.yaw;
            inner.isPickable = false;
        });
    });
    return true;
}

// ==================================================================== Props

function buildProps(scene: BABYLON.Scene, frame: DeskFrame, deskBox: FrameBox, materials: Materials): void {
    const deskTopY = deskBox.maxY;

    // Coffee mug on the front-left corner of the desk.
    const mugX = deskBox.minX + 2.4;
    const mugZ = deskBox.maxZ - 2.2;
    const mug = BABYLON.MeshBuilder.CreateCylinder("ff-mug", { diameter: 1.9, height: 2.1, tessellation: 24 }, scene);
    mug.material = materials.cream;
    place(mug, frame, mugX, deskTopY + 1.05, mugZ);
    const coffee = BABYLON.MeshBuilder.CreateCylinder("ff-mug-coffee", { diameter: 1.6, height: 0.1, tessellation: 24 }, scene);
    coffee.material = materials.coffee;
    place(coffee, frame, mugX, deskTopY + 1.95, mugZ);
    const handle = BABYLON.MeshBuilder.CreateTorus("ff-mug-handle", { diameter: 1.1, thickness: 0.28, tessellation: 20 }, scene);
    handle.material = materials.accent;
    handle.rotation.x = Math.PI / 2;
    handle.position.copyFrom(frame.toWorld(mugX - 1.05, deskTopY + 1.05, mugZ));
    // Ring standing upright beside the mug, facing the front of the desk.
    handle.rotation.y = frame.yaw;
    handle.isPickable = false;

    // Potted plant on the floor beside the desk.
    const plantX = deskBox.minX - 3.6;
    // Slightly towards the front, clear of the C# trophy behind it.
    const plantZ = ((deskBox.minZ + deskBox.maxZ) / 2) + 3.5;
    const pot = BABYLON.MeshBuilder.CreateCylinder("ff-plant-pot", { diameterTop: 3.8, diameterBottom: 2.8, height: 3.4, tessellation: 28 }, scene);
    pot.material = materials.pot;
    place(pot, frame, plantX, GROUND_Y + 1.7, plantZ);
    const rim = BABYLON.MeshBuilder.CreateTorus("ff-plant-rim", { diameter: 3.7, thickness: 0.45, tessellation: 28 }, scene);
    rim.material = materials.pot;
    place(rim, frame, plantX, GROUND_Y + 3.4, plantZ);
    const soil = BABYLON.MeshBuilder.CreateCylinder("ff-plant-soil", { diameter: 3.4, height: 0.2, tessellation: 24 }, scene);
    soil.material = materials.soil;
    place(soil, frame, plantX, GROUND_Y + 3.25, plantZ);

    const random = createRandom(55);
    const leafTemplates = materials.leaves.map((material, i) => {
        const leaf = createLumpyBall(`ff-plant-leaf-${i}`, scene, random, 1.2, 2);
        leaf.material = material;
        leaf.isVisible = false;
        return leaf;
    });
    const leafLayout = [
        { x: 0, y: 5.6, z: 0, r: 1.9 },
        { x: 1.2, y: 4.6, z: 0.4, r: 1.5 },
        { x: -1.1, y: 4.8, z: -0.3, r: 1.5 },
        { x: 0.2, y: 4.5, z: -1.2, r: 1.4 },
        { x: -0.3, y: 4.4, z: 1.2, r: 1.3 },
        { x: 0.4, y: 6.9, z: 0.2, r: 1.2 },
    ];
    leafLayout.forEach((layout, i) => {
        const leaf = leafTemplates[i % leafTemplates.length].createInstance(`ff-plant-leaves-${i}`);
        leaf.position.copyFrom(frame.toWorld(plantX + layout.x, GROUND_Y + layout.y, plantZ + layout.z));
        leaf.scaling.set(layout.r, layout.r * 0.9, layout.r);
        leaf.rotation.y = random() * Math.PI * 2;
        leaf.isPickable = false;
    });
}

// ==================================================================== Helpers

/** Bounding box of a mesh's vertices, measured in the desk's frame. */
function getFrameBox(mesh: BABYLON.AbstractMesh, frame: DeskFrame): FrameBox {
    mesh.computeWorldMatrix(true);
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind) ?? [];
    const world = mesh.getWorldMatrix();
    const point = new BABYLON.Vector3();
    const box: FrameBox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (let i = 0; i < positions.length; i += 3) {
        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, point);
        const x = BABYLON.Vector3.Dot(point, frame.right);
        const z = BABYLON.Vector3.Dot(point, frame.forward);
        box.minX = Math.min(box.minX, x);
        box.maxX = Math.max(box.maxX, x);
        box.minY = Math.min(box.minY, point.y);
        box.maxY = Math.max(box.maxY, point.y);
        box.minZ = Math.min(box.minZ, z);
        box.maxZ = Math.max(box.maxZ, z);
    }
    return box;
}

/** Positions a mesh in the desk frame and turns it with the desk. */
function place(mesh: BABYLON.AbstractMesh, frame: DeskFrame, x: number, y: number, z: number): void {
    mesh.position.copyFrom(frame.toWorld(x, y, z));
    mesh.rotation.y = frame.yaw;
    mesh.isPickable = false;
}

/** The C# logo becomes a shiny gold trophy. */
function restyleTrophy(scene: BABYLON.Scene): void {
    const trophy = scene.getMeshByName("c#");
    if (!trophy) {
        return;
    }

    const gold = createToyMaterial(scene, "toy-trophy-gold", PALETTE.trophy, { roughness: 0.25, metallic: 0.75, clearCoat: 0.6 });
    trophy.getChildMeshes().forEach((mesh) => {
        mesh.material = gold;
    });
}

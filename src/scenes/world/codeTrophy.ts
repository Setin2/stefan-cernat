import * as BABYLON from "@babylonjs/core";

import { FACE_CAMERA_YAW, GROUND_Y } from "../core/constants";
import { createRoundedBox, createToyMaterial, extrudeOutline } from "../core/toyStyle";

/**
 * The C# trophy: a gold cup with two loop handles on a purple plinth, with a hexagon "C#" badge on
 * the front of the cup. It replaces the imported C# logo model (whose physics box ended up out of
 * step with what was drawn, so the tank drove straight through it).
 *
 * Like the AI trophies it can be pushed around: an invisible box collider carries the visible
 * parts, and its name ends in "-collider" so hits play the trophy sound.
 *
 * Built at size 1 in trophy space: y = 0 is the ground, the front faces -Z.
 */

const ID = "code-trophy";
/** Where the C# logo model stood (x, z). */
const POSITION = new BABYLON.Vector2(-117.93, -15.92);
const SCALE = 1.5;

const PALETTE = {
    plinth: "#5B3A8C",
    plinthTop: "#E8DCC6",
    gold: "#C9A35B",
    badge: "#7E57C2",
    letters: "#FFFFFF",
};

/** The cup's outline, turned around the Y axis: (radius, height) from the foot up and back down inside. */
const CUP_PROFILE: [number, number][] = [
    [0, 1.6],
    [1.45, 1.6],
    [1.45, 1.85],
    [1.15, 2.05],
    [0.55, 2.2],
    [0.36, 2.55],
    [0.34, 3.1],
    // A knot halfway up the stem.
    [0.62, 3.3],
    [0.62, 3.55],
    [0.36, 3.75],
    [0.42, 4.15],
    // The bowl, widening up to a rolled rim.
    [0.95, 4.45],
    [1.5, 4.85],
    [1.88, 5.4],
    [2.1, 6.1],
    [2.2, 6.9],
    [2.42, 7.15],
    [2.42, 7.35],
    [2.2, 7.38],
    // Inside the bowl.
    [2.0, 7.2],
    [1.92, 6.4],
    [1.6, 5.5],
    [0.9, 5.0],
    [0, 4.9],
];

/** Collider size (trophy space), covering the plinth, the cup and its handles. */
const BOX = { width: 5.6, height: 7.4, depth: 4.4 };

export function createCodeTrophy(scene: BABYLON.Scene): void {
    removeLogoModel(scene);

    const yaw = FACE_CAMERA_YAW + 0.1;
    const collider = BABYLON.MeshBuilder.CreateBox(`${ID}-collider`, { width: BOX.width * SCALE, height: BOX.height * SCALE, depth: BOX.depth * SCALE }, scene);
    collider.position.set(POSITION.x, GROUND_Y + (BOX.height * SCALE / 2) + 0.05, POSITION.y);
    collider.rotation.y = yaw;
    collider.isVisible = false;
    collider.isPickable = false;
    // Same feel as the AI trophies: no bounce, slides and tips when bumped.
    const impostor = new BABYLON.PhysicsImpostor(collider, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 4, friction: 0.6, restitution: 0 }, scene);
    collider.physicsImpostor = impostor;
    const body = impostor.physicsBody as { linearDamping?: number; angularDamping?: number } | null;
    if (body) {
        body.linearDamping = 0.15;
        body.angularDamping = 0.3;
    }

    const root = new BABYLON.TransformNode(ID, scene);
    root.parent = collider;
    root.position.y = -BOX.height * SCALE / 2;
    root.scaling.setAll(SCALE);
    for (const mesh of buildModel(scene)) {
        mesh.parent = root;
        mesh.isPickable = false;
        // Moves with its physics body, so its world matrix mustn't be frozen.
        mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
    }
}

/** The imported logo: a box with a physics body and the logo mesh as its child. */
function removeLogoModel(scene: BABYLON.Scene): void {
    const logo = scene.getMeshByName("c#");
    if (!logo) {
        return;
    }
    // The scene loader doesn't set mesh.physicsImpostor, so find the body through the engine.
    (logo.physicsImpostor ?? scene.getPhysicsEngine()?.getImpostorForPhysicsObject(logo))?.dispose();
    logo.dispose();
}

function buildModel(scene: BABYLON.Scene): BABYLON.Mesh[] {
    const gold = createToyMaterial(scene, `${ID}-gold`, PALETTE.gold, { roughness: 0.25, metallic: 0.75, clearCoat: 0.6 });
    const meshes: BABYLON.Mesh[] = [];

    // Two-step plinth.
    const plinth = createRoundedBox(`${ID}-plinth`, 4.4, 1.2, 4.2, 0.3, scene);
    plinth.material = createToyMaterial(scene, `${ID}-plinth-material`, PALETTE.plinth, { roughness: 0.45, clearCoat: 0.4 });
    plinth.position.y = 0.6;
    const top = createRoundedBox(`${ID}-plinth-top`, 3.6, 0.4, 3.4, 0.15, scene);
    top.material = createToyMaterial(scene, `${ID}-plinth-top-material`, PALETTE.plinthTop, { roughness: 0.45, clearCoat: 0.35 });
    top.position.y = 1.4;
    meshes.push(plinth, top);

    // The cup, with both handles merged in (one draw call).
    const cup = BABYLON.MeshBuilder.CreateLathe(`${ID}-cup`, {
        shape: CUP_PROFILE.map(([r, y]) => new BABYLON.Vector3(r, y, 0)),
        tessellation: 40,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene);
    const handles = [-1, 1].map((side) => createHandle(scene, side));
    const goldParts = BABYLON.Mesh.MergeMeshes([cup, ...handles], true, true) ?? cup;
    goldParts.name = `${ID}-gold-parts`;
    goldParts.material = gold;
    meshes.push(goldParts);

    meshes.push(...createBadge(scene));
    return meshes;
}

/** A loop handle on one side of the bowl, from just under the rim curling out and back in lower down. */
function createHandle(scene: BABYLON.Scene, side: number): BABYLON.Mesh {
    const from = new BABYLON.Vector3(2.05, 6.6, 0);
    const out1 = new BABYLON.Vector3(3.3, 6.9, 0);
    const out2 = new BABYLON.Vector3(3.2, 5.0, 0);
    const to = new BABYLON.Vector3(1.55, 4.95, 0);
    const curve = BABYLON.Curve3.CreateCubicBezier(from, out1, out2, to, 24).getPoints();
    const path = curve.map((point) => new BABYLON.Vector3(point.x * side, point.y, point.z));
    return BABYLON.MeshBuilder.CreateTube(`${ID}-handle-${side}`, {
        path,
        radiusFunction: (i) => 0.2 + (0.06 * Math.sin((i / (path.length - 1)) * Math.PI)),
        tessellation: 14,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
}

/** A purple hexagon on the front of the bowl with a white "C#" on it. */
function createBadge(scene: BABYLON.Scene): BABYLON.Mesh[] {
    const centerY = 6.1;
    // Just in front of the bowl's surface at that height.
    const frontZ = -2.06;

    const hexagon: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 6) + (i * Math.PI / 3);
        hexagon.push([Math.cos(angle) * 0.95, Math.sin(angle) * 0.95]);
    }
    const badge = extrudeOutline(`${ID}-badge`, hexagon, 0.3, 0.08, scene);
    badge.position.set(0, centerY, frontZ);
    badge.material = createToyMaterial(scene, `${ID}-badge-material`, PALETTE.badge, { roughness: 0.35, clearCoat: 0.7 });

    // The letters are built around the origin and then moved onto the badge.
    // "C": an open ring.
    const arc: BABYLON.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
        const angle = 0.75 + ((i / 20) * (Math.PI * 2 - 1.5));
        arc.push(new BABYLON.Vector3(-0.28 + (Math.cos(angle) * 0.45), Math.sin(angle) * 0.45, 0));
    }
    const letterC = BABYLON.MeshBuilder.CreateTube(`${ID}-c`, { path: arc, radius: 0.11, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL }, scene);

    // "#": two slanted uprights and two crossbars (tubes, so they merge with the "C").
    const stroke = (name: string, x1: number, y1: number, x2: number, y2: number) => BABYLON.MeshBuilder.CreateTube(name, {
        path: [new BABYLON.Vector3(x1, y1, 0), new BABYLON.Vector3(x2, y2, 0)],
        radius: 0.06,
        tessellation: 8,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    const sharpParts: BABYLON.Mesh[] = [];
    for (const offset of [-0.13, 0.13]) {
        sharpParts.push(stroke(`${ID}-sharp-v`, 0.52 + offset - 0.05, -0.3, 0.52 + offset + 0.05, 0.3));
        sharpParts.push(stroke(`${ID}-sharp-h`, 0.27, offset, 0.77, offset));
    }
    const letters = BABYLON.Mesh.MergeMeshes([letterC, ...sharpParts], true, true);
    if (!letters) {
        return [badge];
    }
    letters.name = `${ID}-letters`;
    letters.position.set(0, centerY, frontZ - 0.18);
    letters.scaling.setAll(0.82);
    letters.material = createToyMaterial(scene, `${ID}-letters-material`, PALETTE.letters, { roughness: 0.35, clearCoat: 0.6 });
    return [badge, letters];
}

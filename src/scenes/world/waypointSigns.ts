import * as BABYLON from "../babylon";

import { addStaticBox } from "../core/staticBodies";
import { createRoundedBox, createToyMaterial, extrudeOutline } from "../core/toyStyle";
import { GROUND_Y, FACE_CAMERA_YAW } from "../core/constants";

/**
 * Toy signposts in place of the flat 3D text lying on the ground ("PROJECTS -->" and
 * "TARGET PRACTICE"): a wooden post on a sand base with cream arrow boards, navy letters and a
 * navy rim. The boards face the camera so they stay readable, and their arrows point left or
 * right on screen towards what they name.
 */

type Board = {
    /** Text on the board; "\n" splits it into lines. */
    label: string;
    /** 1 points right on screen, -1 points left, 0 points up (straight ahead, away from the camera). */
    direction: 1 | -1 | 0;
    /** Height of the board's centre above the ground (before scaling). */
    y: number;
    length: number;
    height: number;
};

type Signpost = {
    id: string;
    x: number;
    z: number;
    postHeight: number;
    boards: Board[];
    /** Small bullseye on top of the post instead of the round cap. */
    bullseye?: boolean;
};

const SCALE = 1.3;

const PALETTE = {
    board: "#F4EBDD",
    rim: "#344B63",
    letters: "#344B63",
    post: "#8B6A50",
    base: "#E8DCC6",
    cap: "#E8869F",
    gold: "#C9A35B",
};

/** The crossroads near the start (where the old "PROJECTS -->" text lay on the ground). */
const CROSSROADS_POSITION = new BABYLON.Vector2(-40.49, 3.75);
/** Where the bullseye-topped "TARGET PRACTICE" sign stands: beside the podium, not in front of it. */
const TARGET_SIGN_POSITION = new BABYLON.Vector2(55, 2);

const SIGNPOSTS: Signpost[] = [
    {
        // Projects (the Fruit Factory) to the right on screen, the targets on the podium to the
        // left, and work straight ahead (on top of the post).
        id: "sign-crossroads",
        x: CROSSROADS_POSITION.x,
        z: CROSSROADS_POSITION.y,
        postHeight: 9.5,
        boards: [
            { label: "WORK", direction: 0, y: 11.9, length: 7.4, height: 4.2 },
            { label: "PROJECTS", direction: 1, y: 7.8, length: 11, height: 2.6 },
            { label: "TARGETS", direction: -1, y: 4.9, length: 10, height: 2.6 },
        ],
    },
    {
        id: "sign-targets",
        x: TARGET_SIGN_POSITION.x,
        z: TARGET_SIGN_POSITION.y,
        postHeight: 8,
        bullseye: true,
        boards: [
            { label: "TARGET\nPRACTICE", direction: -1, y: 5.6, length: 11, height: 4 },
        ],
    },
];

export function createWaypointSigns(scene: BABYLON.Scene): void {
    const materials = {
        board: createToyMaterial(scene, "toy-signpost-board", PALETTE.board, { roughness: 0.45, clearCoat: 0.5 }),
        rim: createToyMaterial(scene, "toy-signpost-rim", PALETTE.rim, { roughness: 0.45, clearCoat: 0.4 }),
        post: createToyMaterial(scene, "toy-signpost-post", PALETTE.post, { roughness: 0.55, clearCoat: 0.3 }),
        base: createToyMaterial(scene, "toy-signpost-base", PALETTE.base, { roughness: 0.5, clearCoat: 0.3 }),
        cap: createToyMaterial(scene, "toy-signpost-cap", PALETTE.cap, { roughness: 0.35, clearCoat: 0.6 }),
        gold: createToyMaterial(scene, "toy-signpost-gold", PALETTE.gold, { roughness: 0.25, metallic: 0.6, clearCoat: 0.6 }),
    };

    for (const signpost of SIGNPOSTS) {
        try {
            createSignpost(scene, signpost, materials);
        } catch (error) {
            console.error(`Signpost "${signpost.id}" failed`, error);
        }
    }
}

type Materials = Record<"board" | "rim" | "post" | "base" | "cap" | "gold", BABYLON.Material>;

function createSignpost(scene: BABYLON.Scene, signpost: Signpost, materials: Materials): void {
    const { id } = signpost;
    const root = new BABYLON.TransformNode(id, scene);
    root.position.set(signpost.x, GROUND_Y, signpost.z);
    root.rotation.y = FACE_CAMERA_YAW;
    root.scaling.setAll(SCALE);

    const add = (mesh: BABYLON.Mesh, material: BABYLON.Material) => {
        mesh.material = material;
        mesh.parent = root;
        mesh.isPickable = false;
        return mesh;
    };

    // Sand base with a bevelled top, and the post.
    add(createRoundedBox(`${id}-base`, 2.8, 0.7, 2.8, 0.25, scene), materials.base).position.y = 0.35;
    const post = add(createRoundedBox(`${id}-post`, 0.9, signpost.postHeight, 0.9, 0.3, scene), materials.post);
    post.position.y = 0.6 + (signpost.postHeight / 2);

    const top = 0.6 + signpost.postHeight;
    if (signpost.bullseye) {
        addBullseye(scene, `${id}-bullseye`, root, top + 1.15, materials);
    } else if (!signpost.boards.some((board) => board.direction === 0)) {
        const cap = add(BABYLON.MeshBuilder.CreateSphere(`${id}-cap`, { diameter: 1.3, segments: 16 }, scene), materials.cap);
        cap.position.y = top + 0.2;
    }

    signpost.boards.forEach((board, index) => {
        createBoard(scene, `${id}-board-${index}`, board, root, materials);
        // Solid box around the board and its rim.
        const center = new BABYLON.Vector3(boardOffset(board), board.y, -0.65);
        addSignCollider(scene, root, center, board.length + 0.6, board.height + 0.6, 0.8);
    });
    if (signpost.bullseye) {
        addSignCollider(scene, root, new BABYLON.Vector3(0, top + 1.15, -0.4), 2.5, 2.5, 1);
    }

    // Static collider around the post so the tank bumps into it instead of driving through.
    addSignCollider(scene, root, new BABYLON.Vector3(0, (signpost.postHeight + 0.6) / 2, 0), 1.4, signpost.postHeight + 0.6, 1.4);
}

/** Static collision box in the signpost's (scaled, rotated) space, so the tank hits the boards. */
function addSignCollider(scene: BABYLON.Scene, root: BABYLON.TransformNode, localCenter: BABYLON.Vector3, width: number, height: number, depth: number): void {
    root.computeWorldMatrix(true);
    addStaticBox(scene, BABYLON.Vector3.TransformCoordinates(localCenter, root.getWorldMatrix()), width * SCALE, height * SCALE, depth * SCALE, {
        rotation: BABYLON.Quaternion.RotationYawPitchRoll(root.rotation.y, 0, 0),
        sound: "post",
    });
}

/** Sideways boards have their tail end over the post; an upward one is centred on it. */
function boardOffset(board: Board): number {
    return board.direction * ((board.length / 2) - 1.1);
}

/**
 * An arrow-shaped board (a pentagon pointing along `direction`) mounted in front of the post, its
 * tail end over the post, with a navy rim, the label and two gold bolts.
 */
function createBoard(scene: BABYLON.Scene, id: string, board: Board, parent: BABYLON.TransformNode, materials: Materials): void {
    const { length, height, direction } = board;
    const tip = height * 0.55;
    const node = new BABYLON.TransformNode(id, scene);
    node.parent = parent;
    // The tail end sits on the post; the board reaches out towards the arrow's tip.
    node.position.set(boardOffset(board), board.y, -0.75);

    const up = direction === 0;
    // An upward arrow's tip is shorter, relative to its width.
    const upTip = height * 0.32;
    const arrow = (l: number, h: number, t: number): [number, number][] => (up
        ? [
            [-l / 2, -h / 2],
            [l / 2, -h / 2],
            [l / 2, (h / 2) - t],
            [0, h / 2],
            [-l / 2, (h / 2) - t],
        ]
        : [
            [-l / 2, -h / 2],
            [(l / 2) - t, -h / 2],
            [l / 2, 0],
            [(l / 2) - t, h / 2],
            [-l / 2, h / 2],
        ].map(([x, y]) => [x * direction, y] as [number, number]));
    const tipSize = up ? upTip : tip;

    const front = extrudeOutline(`${id}-face`, arrow(length, height, tipSize), 0.5, 0.12, scene);
    front.material = materials.board;
    front.parent = node;

    const rim = extrudeOutline(`${id}-rim`, arrow(length + 0.6, height + 0.6, tipSize + 0.3), 0.4, 0.1, scene);
    rim.material = materials.rim;
    rim.parent = node;
    rim.position.z = 0.2;

    // Label over the rectangular part of the board.
    const label = up
        ? createLabel(scene, `${id}-label`, board.label, length - 1.6, (height - upTip) * 0.8)
        : createLabel(scene, `${id}-label`, board.label, length - tip - 1.6, height * 0.8);
    if (label) {
        label.parent = node;
        if (up) {
            label.position.set(0, -upTip / 2, -0.27);
        } else {
            label.position.set((-direction * (tip / 2)) + (direction * 0.15), 0, -0.27);
        }
    }

    // Two bolts near the tail, where the board is "screwed" to the post.
    for (const side of [-1, 1]) {
        const bolt = BABYLON.MeshBuilder.CreateSphere(`${id}-bolt-${side}`, { diameter: 0.34, segments: 8 }, scene);
        bolt.scaling.z = 0.45;
        bolt.material = materials.gold;
        bolt.parent = node;
        if (up) {
            // In the bottom corners.
            bolt.position.set(side * ((length / 2) - 0.45), -(height / 2) + 0.45, -0.27);
        } else {
            bolt.position.set(-direction * ((length / 2) - 0.45), side * height * 0.3, -0.27);
        }
    }

    for (const mesh of node.getChildMeshes()) {
        mesh.isPickable = false;
    }
}

/** Flat plane with the label in navy letters on a transparent background, sized to fit. */
function createLabel(scene: BABYLON.Scene, name: string, text: string, width: number, height: number): BABYLON.Mesh | null {
    const textureWidth = 1024;
    const textureHeight = Math.max(64, Math.round((textureWidth * height) / width));
    let texture: BABYLON.DynamicTexture;
    try {
        texture = new BABYLON.DynamicTexture(`${name}-texture`, { width: textureWidth, height: textureHeight }, scene, true);
    } catch {
        return null;
    }
    texture.hasAlpha = true;

    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, textureWidth, textureHeight);
    context.fillStyle = PALETTE.letters;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const lines = text.split("\n");
    const font = (size: number) => `900 ${size}px "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", Arial, sans-serif`;
    // Largest size that fits both the height (all lines) and the width (longest line).
    let size = (textureHeight / lines.length) * 0.82;
    context.font = font(size);
    const widest = Math.max(...lines.map((line) => context.measureText(line).width));
    if (widest > textureWidth * 0.96) {
        size *= (textureWidth * 0.96) / widest;
        context.font = font(size);
    }
    const lineHeight = textureHeight / lines.length;
    lines.forEach((line, i) => context.fillText(line, textureWidth / 2, (lineHeight * (i + 0.5)) + (size * 0.04)));
    texture.update();

    const material = new BABYLON.StandardMaterial(`${name}-material`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.15, 0.15, 0.18);

    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}

/** A small target on top of the post: rings stepping out towards the camera. */
function addBullseye(scene: BABYLON.Scene, id: string, parent: BABYLON.TransformNode, y: number, materials: Materials): void {
    const node = new BABYLON.TransformNode(id, scene);
    node.parent = parent;
    node.position.set(0, y, -0.2);
    // Cylinders stand along Y; tip them so their faces point at the camera (-Z).
    node.rotation.x = -Math.PI / 2;

    const rings: { radius: number; material: BABYLON.Material; top: number }[] = [
        { radius: 1.25, material: materials.rim, top: 0.2 },
        { radius: 1.05, material: materials.board, top: 0.3 },
        { radius: 0.75, material: materials.cap, top: 0.38 },
        { radius: 0.46, material: materials.board, top: 0.46 },
        { radius: 0.22, material: materials.gold, top: 0.56 },
    ];
    rings.forEach((ring, i) => {
        const height = ring.top + 0.2;
        const disc = BABYLON.MeshBuilder.CreateCylinder(`${id}-ring-${i}`, { diameter: ring.radius * 2, height, tessellation: 40 }, scene);
        disc.material = ring.material;
        disc.parent = node;
        disc.position.y = ring.top - (height / 2);
        disc.isPickable = false;
    });
}

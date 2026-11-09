import * as BABYLON from "../babylon";

import { FACE_CAMERA_YAW, GROUND_Y } from "../core/constants";
import { createRoundedBox, createToyMaterial, extrudeOutline } from "../core/toyStyle";

/**
 * Programming-language trophies: a gold cup with two loop handles on a plinth, with the language's
 * badge on the front of the cup.
 *
 * - C#, beside the projects desk, where an imported C# logo model used to stand.
 * - Python, beside the work corner: a blue badge with a yellow "Py", and a toy snake coiled round
 *   the cup's stem.
 *
 * Like the AI trophies they can be pushed around: an invisible box collider carries the visible
 * parts, and its name ends in "-collider" so hits play the trophy sound.
 *
 * Built at size 1 in trophy space: y = 0 is the ground, the front faces -Z.
 */

const SCALE = 1.5;

type TrophySpec = {
    id: string;
    /** On the ground (x, z). */
    position: BABYLON.Vector2;
    /** Turn away from facing the camera straight on, so trophies don't look too perfect. */
    yawOffset: number;
    plinth: string;
    /** The badge on the front of the cup, centred at (0, centerY, frontZ). */
    badge: (scene: BABYLON.Scene, id: string, centerY: number, frontZ: number) => BABYLON.Mesh[];
    /** Anything else to add (in trophy space). */
    extras?: (scene: BABYLON.Scene, id: string) => BABYLON.Mesh[];
};

const PALETTE = {
    plinthTop: "#E8DCC6",
    gold: "#C9A35B",
    csharp: { plinth: "#5B3A8C", badge: "#7E57C2", letters: "#FFFFFF" },
    python: { plinth: "#2B5B84", badge: "#3776AB", letters: "#FFD43B", snake: "#FFD43B", eyes: "#22313F" },
};

/** Where the C# logo model stood (x, z). */
const CSHARP_POSITION = new BABYLON.Vector2(-117.93, -15.92);
/** Left of the work corner's info stand (on screen), between the path and the brick wall. */
const PYTHON_POSITION = new BABYLON.Vector2(4.4, -42.8);

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

export function createCSharpTrophy(scene: BABYLON.Scene): void {
    createTrophy(scene, {
        id: "csharp-trophy",
        position: CSHARP_POSITION,
        yawOffset: 0.1,
        plinth: PALETTE.csharp.plinth,
        badge: createCSharpBadge,
    });
}

export function createPythonTrophy(scene: BABYLON.Scene): void {
    createTrophy(scene, {
        id: "python-trophy",
        position: PYTHON_POSITION,
        yawOffset: -0.12,
        plinth: PALETTE.python.plinth,
        badge: createPythonBadge,
        extras: createSnake,
    });
}

function createTrophy(scene: BABYLON.Scene, spec: TrophySpec): void {
    const { id } = spec;
    const yaw = FACE_CAMERA_YAW + spec.yawOffset;
    const collider = BABYLON.MeshBuilder.CreateBox(`${id}-collider`, { width: BOX.width * SCALE, height: BOX.height * SCALE, depth: BOX.depth * SCALE }, scene);
    collider.position.set(spec.position.x, GROUND_Y + (BOX.height * SCALE / 2) + 0.05, spec.position.y);
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

    const root = new BABYLON.TransformNode(id, scene);
    root.parent = collider;
    root.position.y = -BOX.height * SCALE / 2;
    root.scaling.setAll(SCALE);
    for (const mesh of buildModel(scene, spec)) {
        mesh.parent = root;
        mesh.isPickable = false;
        // Moves with its physics body, so its world matrix mustn't be frozen.
        mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
    }
}

function buildModel(scene: BABYLON.Scene, spec: TrophySpec): BABYLON.Mesh[] {
    const { id } = spec;
    const gold = scene.getMaterialByName("code-trophy-gold") ?? createToyMaterial(scene, "code-trophy-gold", PALETTE.gold, { roughness: 0.25, metallic: 0.75, clearCoat: 0.6 });
    const plinthTop = scene.getMaterialByName("code-trophy-plinth-top") ?? createToyMaterial(scene, "code-trophy-plinth-top", PALETTE.plinthTop, { roughness: 0.45, clearCoat: 0.35 });
    const meshes: BABYLON.Mesh[] = [];

    // Two-step plinth.
    const plinth = createRoundedBox(`${id}-plinth`, 4.4, 1.2, 4.2, 0.3, scene);
    plinth.material = createToyMaterial(scene, `${id}-plinth-material`, spec.plinth, { roughness: 0.45, clearCoat: 0.4 });
    plinth.position.y = 0.6;
    const top = createRoundedBox(`${id}-plinth-top`, 3.6, 0.4, 3.4, 0.15, scene);
    top.material = plinthTop;
    top.position.y = 1.4;
    meshes.push(plinth, top);

    // The cup, with both handles merged in (one draw call).
    const cup = BABYLON.MeshBuilder.CreateLathe(`${id}-cup`, {
        shape: CUP_PROFILE.map(([r, y]) => new BABYLON.Vector3(r, y, 0)),
        tessellation: 40,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene);
    const handles = [-1, 1].map((side) => createHandle(scene, id, side));
    const goldParts = BABYLON.Mesh.MergeMeshes([cup, ...handles], true, true) ?? cup;
    goldParts.name = `${id}-gold-parts`;
    goldParts.material = gold;
    meshes.push(goldParts);

    // The badge sits just in front of the bowl's surface.
    meshes.push(...spec.badge(scene, id, 6.1, -2.06));
    meshes.push(...(spec.extras?.(scene, id) ?? []));
    return meshes;
}

/** A loop handle on one side of the bowl, from just under the rim curling out and back in lower down. */
function createHandle(scene: BABYLON.Scene, id: string, side: number): BABYLON.Mesh {
    const from = new BABYLON.Vector3(2.05, 6.6, 0);
    const out1 = new BABYLON.Vector3(3.3, 6.9, 0);
    const out2 = new BABYLON.Vector3(3.2, 5.0, 0);
    const to = new BABYLON.Vector3(1.55, 4.95, 0);
    const curve = BABYLON.Curve3.CreateCubicBezier(from, out1, out2, to, 24).getPoints();
    const path = curve.map((point) => new BABYLON.Vector3(point.x * side, point.y, point.z));
    return BABYLON.MeshBuilder.CreateTube(`${id}-handle-${side}`, {
        path,
        radiusFunction: (i) => 0.2 + (0.06 * Math.sin((i / (path.length - 1)) * Math.PI)),
        tessellation: 14,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
}

/** A purple hexagon with a white "C#" on it. */
function createCSharpBadge(scene: BABYLON.Scene, id: string, centerY: number, frontZ: number): BABYLON.Mesh[] {
    const hexagon: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 6) + (i * Math.PI / 3);
        hexagon.push([Math.cos(angle) * 0.95, Math.sin(angle) * 0.95]);
    }
    const badge = extrudeOutline(`${id}-badge`, hexagon, 0.3, 0.08, scene);
    badge.position.set(0, centerY, frontZ);
    badge.material = createToyMaterial(scene, `${id}-badge-material`, PALETTE.csharp.badge, { roughness: 0.35, clearCoat: 0.7 });

    // The letters are built around the origin and then moved onto the badge.
    // "C": an open ring.
    const arc: BABYLON.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
        const angle = 0.75 + ((i / 20) * (Math.PI * 2 - 1.5));
        arc.push(new BABYLON.Vector3(-0.28 + (Math.cos(angle) * 0.45), Math.sin(angle) * 0.45, 0));
    }
    const letterC = BABYLON.MeshBuilder.CreateTube(`${id}-c`, { path: arc, radius: 0.11, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL }, scene);

    // "#": two slanted uprights and two crossbars (tubes, so they merge with the "C").
    const stroke = (name: string, x1: number, y1: number, x2: number, y2: number) => BABYLON.MeshBuilder.CreateTube(name, {
        path: [new BABYLON.Vector3(x1, y1, 0), new BABYLON.Vector3(x2, y2, 0)],
        radius: 0.06,
        tessellation: 8,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    const sharpParts: BABYLON.Mesh[] = [];
    for (const offset of [-0.13, 0.13]) {
        sharpParts.push(stroke(`${id}-sharp-v`, 0.52 + offset - 0.05, -0.3, 0.52 + offset + 0.05, 0.3));
        sharpParts.push(stroke(`${id}-sharp-h`, 0.27, offset, 0.77, offset));
    }
    const letters = BABYLON.Mesh.MergeMeshes([letterC, ...sharpParts], true, true);
    if (!letters) {
        return [badge];
    }
    letters.name = `${id}-letters`;
    letters.position.set(0, centerY, frontZ - 0.18);
    letters.scaling.setAll(0.82);
    letters.material = createToyMaterial(scene, `${id}-letters-material`, PALETTE.csharp.letters, { roughness: 0.35, clearCoat: 0.6 });
    return [badge, letters];
}

/** A blue rounded square with a yellow "Py" on it. */
function createPythonBadge(scene: BABYLON.Scene, id: string, centerY: number, frontZ: number): BABYLON.Mesh[] {
    const half = 0.82;
    const corner = 0.3;
    const square: [number, number][] = [];
    for (const [cx, cy, start] of [[half - corner, half - corner, 0], [-(half - corner), half - corner, 0.5], [-(half - corner), -(half - corner), 1], [half - corner, -(half - corner), 1.5]] as const) {
        for (let i = 0; i <= 6; i++) {
            const angle = (start + (i / 12)) * Math.PI;
            square.push([cx + (Math.cos(angle) * corner), cy + (Math.sin(angle) * corner)]);
        }
    }
    const badge = extrudeOutline(`${id}-badge`, square, 0.3, 0.08, scene);
    badge.position.set(0, centerY, frontZ);
    badge.material = createToyMaterial(scene, `${id}-badge-material`, PALETTE.python.badge, { roughness: 0.35, clearCoat: 0.7 });

    // The letters are built around the origin as tubes, then moved onto the badge.
    const stroke = (name: string, points: [number, number][], radius = 0.09) => BABYLON.MeshBuilder.CreateTube(name, {
        path: points.map(([x, y]) => new BABYLON.Vector3(x, y, 0)),
        radius,
        tessellation: 8,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    // "P": an upright and a rounded bowl at the top.
    const bowl: [number, number][] = [[-0.45, 0.42]];
    for (let i = 0; i <= 12; i++) {
        const angle = (Math.PI / 2) - ((i / 12) * Math.PI);
        bowl.push([-0.3 + (Math.cos(angle) * 0.24), 0.21 + (Math.sin(angle) * 0.21)]);
    }
    bowl.push([-0.45, 0]);
    const parts = [
        stroke(`${id}-p-stem`, [[-0.45, -0.42], [-0.45, 0.42]]),
        stroke(`${id}-p-bowl`, bowl),
        // "y": a short arm and a long one that drops below the line.
        stroke(`${id}-y-left`, [[0.08, 0.14], [0.27, -0.16]]),
        stroke(`${id}-y-right`, [[0.48, 0.14], [0.2, -0.46], [0.08, -0.5]]),
    ];
    const letters = BABYLON.Mesh.MergeMeshes(parts, true, true);
    if (!letters) {
        return [badge];
    }
    letters.name = `${id}-letters`;
    letters.position.set(0, centerY, frontZ - 0.18);
    letters.material = createToyMaterial(scene, `${id}-letters-material`, PALETTE.python.letters, { roughness: 0.35, clearCoat: 0.6 });
    return [badge, letters];
}

/** A toy snake coiled twice round the cup's stem, its head raised at the front. */
function createSnake(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const turns = 2.1;
    const steps = 60;
    const bottom = 1.82;
    const top = 3.5;
    const path: BABYLON.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Ends at the front (-Z), facing the camera.
        const angle = (-Math.PI / 2) - ((1 - t) * turns * Math.PI * 2);
        const radius = 0.78 + (0.12 * Math.sin(t * Math.PI));
        path.push(new BABYLON.Vector3(Math.cos(angle) * radius, bottom + ((top - bottom) * t), Math.sin(angle) * radius));
    }
    const body = BABYLON.MeshBuilder.CreateTube(`${id}-snake-body`, {
        path,
        // A thin tail growing to a thick neck.
        radiusFunction: (i) => 0.06 + (0.16 * Math.min(1, (i / steps) * 1.6)),
        tessellation: 12,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);

    // The head: a slightly flattened ball, raised out in front of the stem.
    const neck = path[path.length - 1];
    const head = BABYLON.MeshBuilder.CreateSphere(`${id}-snake-head`, { diameter: 0.62, segments: 14 }, scene);
    head.scaling.set(1, 0.75, 1.25);
    head.position.set(neck.x, neck.y + 0.12, neck.z - 0.22);
    const snake = BABYLON.Mesh.MergeMeshes([body, head], true, true) ?? body;
    snake.name = `${id}-snake`;
    snake.material = createToyMaterial(scene, `${id}-snake-material`, PALETTE.python.snake, { roughness: 0.35, clearCoat: 0.7 });

    const eyes = [-1, 1].map((side) => {
        const eye = BABYLON.MeshBuilder.CreateSphere(`${id}-snake-eye-${side}`, { diameter: 0.12, segments: 8 }, scene);
        eye.position.set(neck.x + (side * 0.15), neck.y + 0.25, neck.z - 0.42);
        return eye;
    });
    const eyeMesh = BABYLON.Mesh.MergeMeshes(eyes, true, true) ?? eyes[0];
    eyeMesh.name = `${id}-snake-eyes`;
    eyeMesh.material = createToyMaterial(scene, `${id}-snake-eyes-material`, PALETTE.python.eyes, { roughness: 0.25, clearCoat: 0.8 });
    return [snake, eyeMesh];
}

import * as BABYLON from "@babylonjs/core";

import { createLumpyBall, createRandom, createRoundedBox, createToyMaterial, extrudeOutline } from "../core/toyStyle";
import { GROUND_Y, FACE_CAMERA_YAW } from "../core/constants";

/**
 * Toy trophies with the logos of the AI assistants used while building the site, in place of the
 * three imported figures (plus three new spots next to them).
 *
 * Each trophy is a navy plinth with a nameplate, a gold stem, and a chunky glossy version of the
 * logo facing the camera. The standing ones are pushable like the figures were: an invisible box
 * collider carries the visible parts.
 *
 * Layout in trophy space: the collider spans 4 x 8 x 4 units centred on the origin, the logo faces
 * -Z and fits in roughly a 3.8 x 4.4 area centred at LOGO_Y.
 */

type LogoKind = "claude" | "chatgpt" | "gemini" | "mistral" | "deepseek" | "huggingface";

type Spot = {
    logo: LogoKind;
    label: string;
    /** World position on the ground (x, z). */
    x: number;
    z: number;
    /** Extra turn around Y, so a row of trophies doesn't look too perfect. */
    yawOffset: number;
    pushable: boolean;
    scale: number;
};

const HALF_HEIGHT = 4;
const LOGO_Y = 1.5;
/** The logo is drawn a bit larger than the plinth so it's easy to recognise. */
const LOGO_SCALE = 1.15;

const PALETTE = {
    plinth: "#344B63",
    plinthTop: "#E8DCC6",
    gold: "#C9A35B",
    nameplate: "#F4EBDD",
};

/** Where the figure at the desk stood. */
const FIGURE_AT_DESK = new BABYLON.Vector2(-86.3, -4.8);

/** Size of the standing trophies (1 = the old figures' 4 x 8 x 4 box). */
const STANDING_SCALE = 1.5;

/**
 * Standing trophies: ChatGPT and Gemini on the camera's side of the brick wall by the Berserk
 * sword (so the wall doesn't hide them), Mistral close to the tank's start (visible straight
 * away), and DeepSeek and Hugging Face out in open areas of the world. All spots are clear of
 * other physics bodies so nothing starts out overlapping.
 */
const SPOTS: Spot[] = [
    { logo: "claude", label: "Claude", x: FIGURE_AT_DESK.x, z: FIGURE_AT_DESK.y, yawOffset: 0, pushable: false, scale: 1.1 },
    { logo: "chatgpt", label: "ChatGPT", x: 23, z: 114, yawOffset: 0.12, pushable: true, scale: STANDING_SCALE },
    { logo: "gemini", label: "Gemini", x: 31, z: 124, yawOffset: -0.1, pushable: true, scale: STANDING_SCALE },
    { logo: "mistral", label: "Mistral", x: 30, z: -4, yawOffset: 0.08, pushable: true, scale: STANDING_SCALE },
    { logo: "deepseek", label: "DeepSeek", x: -28, z: 36, yawOffset: -0.12, pushable: true, scale: STANDING_SCALE },
    { logo: "huggingface", label: "Hugging Face", x: 72, z: -100, yawOffset: 0.14, pushable: true, scale: STANDING_SCALE },
];

export function createAiTrophies(scene: BABYLON.Scene): void {
    removeFigures(scene);

    const shared = {
        plinth: createToyMaterial(scene, "ai-trophy-plinth", PALETTE.plinth, { roughness: 0.45, clearCoat: 0.4 }),
        plinthTop: createToyMaterial(scene, "ai-trophy-plinth-top", PALETTE.plinthTop, { roughness: 0.45, clearCoat: 0.35 }),
        gold: createToyMaterial(scene, "ai-trophy-gold", PALETTE.gold, { roughness: 0.25, metallic: 0.6, clearCoat: 0.6 }),
    };

    for (const spot of SPOTS) {
        try {
            createTrophy(scene, spot, shared);
        } catch (error) {
            console.error(`AI trophy "${spot.label}" failed`, error);
        }
    }
}

function removeFigures(scene: BABYLON.Scene): void {
    const physics = scene.getPhysicsEngine();
    const figures = scene.meshes.filter((mesh) => mesh.name === "amongus" && !mesh.parent);
    for (const figure of figures) {
        // The scene loader creates the physics bodies without setting mesh.physicsImpostor, so
        // disposing the mesh alone would leave an invisible body behind for the trophies to hit.
        (figure.physicsImpostor ?? physics?.getImpostorForPhysicsObject(figure))?.dispose();
        figure.dispose();
    }
}

type SharedMaterials = { plinth: BABYLON.Material; plinthTop: BABYLON.Material; gold: BABYLON.Material };

function createTrophy(scene: BABYLON.Scene, spot: Spot, shared: SharedMaterials): void {
    const id = `ai-trophy-${spot.logo}`;
    const yaw = FACE_CAMERA_YAW + spot.yawOffset;
    const centerY = GROUND_Y + (HALF_HEIGHT * spot.scale) + 0.05;

    // Root: a physics box for the pushable ones (impostor created before any children are added),
    // a plain node for the one at the desk.
    let holder: BABYLON.TransformNode;
    if (spot.pushable) {
        const collider = BABYLON.MeshBuilder.CreateBox(`${id}-collider`, { width: 4 * spot.scale, height: HALF_HEIGHT * 2 * spot.scale, depth: 4 * spot.scale }, scene);
        collider.position.set(spot.x, centerY, spot.z);
        collider.rotation.y = yaw;
        collider.isVisible = false;
        collider.isPickable = false;
        // No bounce and decent grip: a bump from the tank slides and tips them instead of
        // sending them flying. Light damping, so they still fall at full speed.
        const impostor = new BABYLON.PhysicsImpostor(collider, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 3, friction: 0.6, restitution: 0 }, scene);
        collider.physicsImpostor = impostor;
        const body = impostor.physicsBody as { linearDamping?: number; angularDamping?: number } | null;
        if (body) {
            body.linearDamping = 0.15;
            body.angularDamping = 0.3;
        }
        holder = collider;
    } else {
        holder = new BABYLON.TransformNode(`${id}-holder`, scene);
        holder.position.set(spot.x, centerY, spot.z);
        holder.rotation.y = yaw;
    }

    // Everything visible is built at size 1 under this node.
    const root = new BABYLON.TransformNode(id, scene);
    root.parent = holder;
    root.scaling.setAll(spot.scale);

    const parts: BABYLON.Mesh[] = [];
    const attach = (mesh: BABYLON.Mesh) => {
        mesh.parent = root;
        mesh.isPickable = false;
        mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
        parts.push(mesh);
        return mesh;
    };

    // Plinth with a sand top and a nameplate on the front.
    const plinth = attach(createRoundedBox(`${id}-plinth`, 3.8, 1.5, 3.8, 0.3, scene));
    plinth.material = shared.plinth;
    plinth.position.y = -HALF_HEIGHT + 0.75;

    const top = attach(createRoundedBox(`${id}-plinth-top`, 3.3, 0.3, 3.3, 0.12, scene));
    top.material = shared.plinthTop;
    top.position.y = -HALF_HEIGHT + 1.55;

    const collar = attach(BABYLON.MeshBuilder.CreateCylinder(`${id}-collar`, { diameterTop: 0.8, diameterBottom: 1.3, height: 0.45, tessellation: 24 }, scene));
    collar.material = shared.gold;
    collar.position.y = -HALF_HEIGHT + 1.9;

    const stem = attach(BABYLON.MeshBuilder.CreateCylinder(`${id}-stem`, { diameter: 0.45, height: 3, tessellation: 16 }, scene));
    stem.material = shared.gold;
    stem.position.set(0, -HALF_HEIGHT + 3.4, 0.15);

    const plate = createNameplate(scene, `${id}-nameplate`, spot.label);
    if (plate) {
        attach(plate);
        plate.position.set(0, -HALF_HEIGHT + 0.75, -1.92);
    }

    // The logo itself.
    const logo = new BABYLON.TransformNode(`${id}-logo`, scene);
    logo.parent = root;
    logo.position.y = LOGO_Y;
    logo.scaling.setAll(LOGO_SCALE);
    for (const mesh of LOGO_BUILDERS[spot.logo](scene, id)) {
        mesh.parent = logo;
        mesh.isPickable = false;
        mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
    }
}

function createNameplate(scene: BABYLON.Scene, name: string, label: string): BABYLON.Mesh | null {
    const width = 512;
    const height = 128;
    let texture: BABYLON.DynamicTexture;
    try {
        texture = new BABYLON.DynamicTexture(`${name}-texture`, { width, height }, scene, true);
    } catch {
        return null;
    }
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, width, height);
    context.fillStyle = PALETTE.nameplate;
    const fontSize = label.length > 9 ? 70 : 84;
    context.font = `900 ${fontSize}px "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, width / 2, height * 0.54);
    texture.update();

    const material = new BABYLON.StandardMaterial(`${name}-material`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);

    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width: 3.3, height: 0.82 }, scene);
    plane.material = material;
    return plane;
}

// ==================================================================== Logos

type LogoBuilder = (scene: BABYLON.Scene, id: string) => BABYLON.Mesh[];

const LOGO_BUILDERS: Record<LogoKind, LogoBuilder> = {
    claude: buildClaude,
    chatgpt: buildChatGpt,
    gemini: buildGemini,
    mistral: buildMistral,
    deepseek: buildDeepSeek,
    huggingface: buildHuggingFace,
};

/** Claude: a terracotta spark of rounded rays with slightly uneven lengths. */
function buildClaude(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const lengths = [1.95, 1.62, 1.84, 1.55, 1.92, 1.7, 1.58, 1.88, 1.66, 1.8, 1.6, 1.86];
    const rays = lengths.map((length, i) => {
        const angle = ((i / lengths.length) * Math.PI * 2) + 0.13 + (Math.sin(i * 2.3) * 0.05);
        const outline = taperedCapsule(length, 0.13, 0.25);
        const ray = extrudeOutline(`${id}-ray-${i}`, rotate2d(outline, angle), 0.55, 0.1, scene);
        return ray;
    });
    const spark = BABYLON.Mesh.MergeMeshes(rays, true, true);
    if (!spark) {
        return [];
    }
    spark.name = `${id}-spark`;
    spark.material = createToyMaterial(scene, `${id}-material`, "#D97757", { roughness: 0.38, clearCoat: 0.6 });
    return [spark];
}

/** ChatGPT: the white six-link knot on a teal rounded tile. */
function buildChatGpt(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const tile = createRoundedBox(`${id}-tile`, 3.8, 3.8, 0.5, 0.7, scene);
    tile.material = createToyMaterial(scene, `${id}-tile-material`, "#10A37F", { roughness: 0.4, clearCoat: 0.6 });
    tile.position.z = 0.1;

    const links: BABYLON.Mesh[] = [];
    const halfLength = 0.5;
    const radius = 0.36;
    for (let k = 0; k < 6; k++) {
        const angle = k * (Math.PI / 3);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const z = -0.32 - ((k % 2) * 0.06);
        // A rounded "link" offset from the centre and slid sideways, so the six of them swirl
        // around a hexagonal opening.
        const path: BABYLON.Vector3[] = [];
        for (const [x, y] of stadium(halfLength, radius, 40)) {
            const lx = x + 0.32;
            const ly = y - 0.62;
            path.push(new BABYLON.Vector3((lx * cos) - (ly * sin), (lx * sin) + (ly * cos), z));
        }
        path.push(path[0].clone());
        links.push(BABYLON.MeshBuilder.CreateTube(`${id}-link-${k}`, { path, radius: 0.13, tessellation: 12, cap: BABYLON.Mesh.NO_CAP }, scene));
    }
    const knot = BABYLON.Mesh.MergeMeshes(links, true, true);
    if (knot) {
        knot.name = `${id}-knot`;
        knot.material = createToyMaterial(scene, `${id}-knot-material`, "#FFFFFF", { roughness: 0.35, clearCoat: 0.6 });
        knot.scaling.setAll(1.12);
        return [tile, knot];
    }
    return [tile];
}

/** Gemini: a four-pointed sparkle with concave sides and a blue-to-purple-to-rose gradient. */
function buildGemini(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const outline: [number, number][] = [];
    const steps = 128;
    const radius = 1.95;
    const power = 2.4;
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        outline.push([radius * Math.sign(c) * Math.pow(Math.abs(c), power), radius * Math.sign(s) * Math.pow(Math.abs(s), power)]);
    }
    const star = extrudeOutline(`${id}-star`, outline, 0.6, 0.12, scene);

    const stops = ["#4796E3", "#9177C7", "#CA6673"].map((hex) => BABYLON.Color3.FromHexString(hex).toLinearSpace());
    paintVertices(star, (x, y) => {
        const t = clampUnit((((x * 0.45) + (y * 0.9)) / (radius * 1.35) + 1) / 2);
        const [a, b, f] = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
        return BABYLON.Color3.Lerp(a, b, f);
    });
    star.material = createToyMaterial(scene, `${id}-material`, "#FFFFFF", { roughness: 0.35, clearCoat: 0.7 });
    return [star];
}

/** Mistral: a blocky "M" of toy cubes, yellow at the top to red at the bottom. */
function buildMistral(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const pattern = [
        "X...X",
        "XX.XX",
        "XXXXX",
        "X.X.X",
        "X...X",
    ];
    const rowColors = ["#FFD800", "#FFAF00", "#FF8205", "#FA500F", "#E10500"];
    const pitch = 0.74;
    const size = 0.7;
    const meshes: BABYLON.Mesh[] = [];
    pattern.forEach((row, r) => {
        const blocks: BABYLON.Mesh[] = [];
        for (let c = 0; c < row.length; c++) {
            if (row[c] !== "X") {
                continue;
            }
            const block = createRoundedBox(`${id}-block-${r}-${c}`, size, size, size, 0.12, scene, 2);
            block.position.set((c - 2) * pitch, (2 - r) * pitch, 0);
            blocks.push(block);
        }
        const merged = BABYLON.Mesh.MergeMeshes(blocks, true, true);
        if (merged) {
            merged.name = `${id}-row-${r}`;
            merged.material = createToyMaterial(scene, `${id}-row-${r}-material`, rowColors[r], { roughness: 0.4, clearCoat: 0.6 });
            meshes.push(merged);
        }
    });
    return meshes;
}

/** DeepSeek: a friendly blue whale with a curled-up tail. */
function buildDeepSeek(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const blue = createToyMaterial(scene, `${id}-material`, "#4D6BFE", { roughness: 0.38, clearCoat: 0.6 });

    // Body: a rounded blob with a big head on the left, narrowing towards the tail.
    const body: [number, number][] = [];
    for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        const taper = 1 - (0.5 * Math.max(c, 0));
        const belly = s < 0 ? 0.82 : 1;
        body.push([-0.35 + (1.45 * c), -0.35 + (0.95 * s * taper * belly)]);
    }
    const bodyMesh = extrudeOutline(`${id}-body`, body, 0.75, 0.16, scene);

    // Tail: curls up from the back of the body, ending in two flukes.
    const tailPath: BABYLON.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const x = ((1 - t) * (1 - t) * 0.85) + (2 * (1 - t) * t * 1.75) + (t * t * 1.45);
        const y = ((1 - t) * (1 - t) * -0.4) + (2 * (1 - t) * t * -0.45) + (t * t * 0.75);
        tailPath.push(new BABYLON.Vector3(x, y, 0));
    }
    const tail = BABYLON.MeshBuilder.CreateTube(`${id}-tail`, {
        path: tailPath,
        radiusFunction: (i) => 0.27 - ((i / 16) * 0.13),
        tessellation: 16,
        cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    tail.scaling.z = 1.35;

    const flukes = [-1, 1].map((side) => {
        const fluke = extrudeOutline(`${id}-fluke-${side}`, rotate2d(ellipse(0.5, 0.2, 24), side * 0.75), 0.4, 0.08, scene);
        fluke.position.set(1.45 + (side * 0.33), 0.92, 0);
        return fluke;
    });

    const whale = BABYLON.Mesh.MergeMeshes([bodyMesh, tail, ...flukes], true, true);
    const meshes: BABYLON.Mesh[] = [];
    if (whale) {
        whale.name = `${id}-whale`;
        whale.material = blue;
        meshes.push(whale);
    }

    // Eye with a little shine.
    const eyeWhite = BABYLON.MeshBuilder.CreateSphere(`${id}-eye`, { diameter: 0.42, segments: 12 }, scene);
    eyeWhite.scaling.z = 0.4;
    eyeWhite.position.set(-1.05, -0.12, -0.38);
    eyeWhite.material = createToyMaterial(scene, `${id}-eye-material`, "#FFFFFF", { roughness: 0.3, clearCoat: 0.6 });
    const pupil = BABYLON.MeshBuilder.CreateSphere(`${id}-pupil`, { diameter: 0.22, segments: 10 }, scene);
    pupil.scaling.z = 0.4;
    pupil.position.set(-1.1, -0.14, -0.45);
    pupil.material = createToyMaterial(scene, `${id}-pupil-material`, "#1E2A4A", { roughness: 0.3, clearCoat: 0.8 });
    meshes.push(eyeWhite, pupil);

    // Lighter belly stripe.
    const belly = extrudeOutline(`${id}-belly`, ellipse(0.9, 0.2, 32).map(([x, y]) => [x - 0.45, y - 0.85] as [number, number]), 0.2, 0.05, scene);
    belly.position.z = -0.3;
    belly.material = createToyMaterial(scene, `${id}-belly-material`, "#A9B9FF", { roughness: 0.4, clearCoat: 0.5 });
    meshes.push(belly);

    return meshes;
}

/** Hugging Face: the yellow hugging smiley with orange hands. */
function buildHuggingFace(scene: BABYLON.Scene, id: string): BABYLON.Mesh[] {
    const faceRadius = 1.65;
    const faceDepth = 0.5;
    const surfaceZ = (x: number, y: number) => -faceRadius * faceDepth * Math.sqrt(Math.max(0, 1 - (((x * x) + (y * y)) / (faceRadius * faceRadius))));
    const dark = createToyMaterial(scene, `${id}-dark`, "#3A3B45", { roughness: 0.3, clearCoat: 0.8 });

    const face = BABYLON.MeshBuilder.CreateSphere(`${id}-face`, { diameter: faceRadius * 2, segments: 32 }, scene);
    face.scaling.z = faceDepth;
    face.position.y = 0.2;
    face.material = createToyMaterial(scene, `${id}-face-material`, "#FFD21E", { roughness: 0.38, clearCoat: 0.6 });

    const meshes: BABYLON.Mesh[] = [face];
    for (const side of [-1, 1]) {
        const x = side * 0.6;
        const y = 0.45;
        const eye = BABYLON.MeshBuilder.CreateSphere(`${id}-eye-${side}`, { diameter: 0.42, segments: 12 }, scene);
        eye.scaling.set(1, 1.25, 0.45);
        eye.position.set(x, y + 0.2, surfaceZ(x, y) - 0.02);
        eye.material = dark;
        meshes.push(eye);

        const shine = BABYLON.MeshBuilder.CreateSphere(`${id}-shine-${side}`, { diameter: 0.12, segments: 8 }, scene);
        shine.scaling.z = 0.4;
        shine.position.set(x + 0.06, y + 0.3, surfaceZ(x, y) - 0.1);
        shine.material = createToyMaterial(scene, `${id}-shine-material-${side}`, "#FFFFFF", { roughness: 0.2 });
        meshes.push(shine);
    }

    // Open smile (a half disc) with a tongue in it.
    const smile: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
        const t = Math.PI + ((i / 24) * Math.PI);
        smile.push([0.85 * Math.cos(t), 0.62 * Math.sin(t)]);
    }
    const mouth = extrudeOutline(`${id}-mouth`, smile, 0.3, 0.06, scene);
    mouth.position.set(0, 0.05, -0.74);
    mouth.material = dark;
    meshes.push(mouth);

    const tongue = extrudeOutline(`${id}-tongue`, ellipse(0.38, 0.17, 24), 0.12, 0.04, scene);
    tongue.position.set(0, -0.38, -0.86);
    tongue.material = createToyMaterial(scene, `${id}-tongue-material`, "#FF6B4A", { roughness: 0.4, clearCoat: 0.5 });
    meshes.push(tongue);

    // Hands coming in from the bottom corners.
    const handMaterial = createToyMaterial(scene, `${id}-hands`, "#FF9D0B", { roughness: 0.4, clearCoat: 0.5 });
    const random = createRandom(42);
    for (const side of [-1, 1]) {
        const hand = createLumpyBall(`${id}-hand-${side}`, scene, random, 1.4, 2);
        hand.scaling.set(0.6, 0.48, 0.42);
        hand.rotation.z = side * -0.5;
        hand.position.set(side * 1.15, -1.15, -0.55);
        hand.material = handMaterial;
        meshes.push(hand);
    }
    return meshes;
}

// ==================================================================== Shape helpers

/** Ray from the origin to `length`, `baseHalfWidth` wide at the centre and `tipHalfWidth` at the rounded tip. */
function taperedCapsule(length: number, baseHalfWidth: number, tipHalfWidth: number): [number, number][] {
    const points: [number, number][] = [];
    const tipCenter = length - tipHalfWidth;
    for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + ((i / 12) * Math.PI);
        points.push([tipCenter + (Math.cos(a) * tipHalfWidth), Math.sin(a) * tipHalfWidth]);
    }
    for (let i = 0; i <= 8; i++) {
        const a = Math.PI / 2 + ((i / 8) * Math.PI);
        points.push([baseHalfWidth + (Math.cos(a) * baseHalfWidth), Math.sin(a) * baseHalfWidth]);
    }
    return points;
}

/** Stadium (rounded rectangle with semicircle ends) along X. */
function stadium(halfLength: number, radius: number, steps: number): [number, number][] {
    const points: [number, number][] = [];
    const half = steps / 2;
    for (let i = 0; i < half; i++) {
        const a = -Math.PI / 2 + ((i / (half - 1)) * Math.PI);
        points.push([halfLength + (Math.cos(a) * radius), Math.sin(a) * radius]);
    }
    for (let i = 0; i < half; i++) {
        const a = Math.PI / 2 + ((i / (half - 1)) * Math.PI);
        points.push([-halfLength + (Math.cos(a) * radius), Math.sin(a) * radius]);
    }
    return points;
}

function ellipse(rx: number, ry: number, steps: number): [number, number][] {
    const points: [number, number][] = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        points.push([rx * Math.cos(t), ry * Math.sin(t)]);
    }
    return points;
}

function rotate2d(points: [number, number][], angle: number): [number, number][] {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return points.map(([x, y]) => [(x * c) - (y * s), (x * s) + (y * c)]);
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

/** Sets per-vertex colours from each vertex's x/y position. */
function paintVertices(mesh: BABYLON.Mesh, color: (x: number, y: number) => BABYLON.Color3): void {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) {
        return;
    }
    const colors: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        const c = color(positions[i], positions[i + 1]);
        colors.push(c.r, c.g, c.b, 1);
    }
    mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
}

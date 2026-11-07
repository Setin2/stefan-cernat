import * as BABYLON from "@babylonjs/core";

import { addStaticBox } from "../core/staticBodies";
import { createRoundedBox, createToyMaterial } from "../core/toyStyle";
import { GROUND_Y, FACE_CAMERA_YAW } from "../core/constants";
import { UI } from "../ui/style";

/**
 * The Fruit Factory's signs:
 *
 * - the 3D "FRUIT FACTORY" title is mounted on a toy shop sign behind the desk: a navy board with a
 *   sand rim on two posts, glowing marquee bulbs round the edge and toy fruit sitting on top;
 * - the description that used to lie on the ground is now a tilted info stand facing the camera,
 *   with the game's name, the description and a "Free on Google Play" pill.
 */

const FONT = UI.font;

const PALETTE = {
    board: "#344B63",
    rim: "#E8DCC6",
    post: "#8B6A50",
    bulb: "#FFE7A8",
    cream: "#F4EBDD",
    navy: "#344B63",
    pink: "#C9667F",
    muted: "#6B7B8C",
    apple: "#D9534F",
    orange: "#F0913A",
    pear: "#C9CF62",
    leaf: "#6E9F7E",
    stem: "#6B4F3A",
};

/** Where the info stand stands: beside the desk, not in front of it from the camera. */
const INFO_STAND_POSITION = new BABYLON.Vector2(-100, 35);

export function createFruitFactorySigns(scene: BABYLON.Scene): void {
    try {
        createTitleSign(scene);
    } catch (error) {
        console.error("Fruit Factory title sign failed", error);
    }
    try {
        createInfoStand(scene);
    } catch (error) {
        console.error("Fruit Factory info stand failed", error);
    }
}

// ==================================================================== Title sign

function createTitleSign(scene: BABYLON.Scene): void {
    const title = scene.getTransformNodeByName("Text");
    const letters = title?.getChildMeshes() ?? [];
    if (!letters.length) {
        return;
    }

    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
    for (const mesh of letters) {
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        min = BABYLON.Vector3.Minimize(min, box.minimumWorld);
        max = BABYLON.Vector3.Maximize(max, box.maximumWorld);
    }

    // The letters run along X and face +Z (towards the camera); the board goes just behind them.
    const width = (max.x - min.x) + 4;
    const height = (max.y - min.y) + 3.4;
    const centerX = (min.x + max.x) / 2;
    const centerY = (min.y + max.y) / 2;
    const boardFront = min.z - 0.15;
    const depth = 0.8;
    const boardZ = boardFront - (depth / 2);

    const materials = {
        board: createToyMaterial(scene, "ff-title-board", PALETTE.board, { roughness: 0.45, clearCoat: 0.4 }),
        rim: createToyMaterial(scene, "ff-title-rim", PALETTE.rim, { roughness: 0.45, clearCoat: 0.4 }),
        post: createToyMaterial(scene, "ff-title-post", PALETTE.post, { roughness: 0.55, clearCoat: 0.3 }),
    };

    const board = createRoundedBox("ff-title-board", width, height, depth, 0.6, scene);
    board.material = materials.board;
    board.position.set(centerX, centerY, boardZ);

    const rim = createRoundedBox("ff-title-board-rim", width + 1.2, height + 1.2, depth * 0.7, 0.8, scene);
    rim.material = materials.rim;
    rim.position.set(centerX, centerY, boardZ - 0.2);

    // Posts from the ground up to the board, at its ends.
    const postTop = centerY;
    for (const side of [-1, 1]) {
        const x = centerX + (side * ((width / 2) - 2.2));
        const post = createRoundedBox(`ff-title-post-${side}`, 1.1, postTop - GROUND_Y, 1.1, 0.35, scene);
        post.material = materials.post;
        post.position.set(x, GROUND_Y + ((postTop - GROUND_Y) / 2), boardZ - 0.9);
        addStaticBox(scene, post.position, 1.3, postTop - GROUND_Y, 1.3);
    }

    // Marquee bulbs round the edge of the board's front.
    const bulbMaterial = new BABYLON.StandardMaterial("ff-title-bulb", scene);
    bulbMaterial.diffuseColor = BABYLON.Color3.FromHexString(PALETTE.bulb);
    bulbMaterial.emissiveColor = BABYLON.Color3.FromHexString(PALETTE.bulb).scale(0.85);
    bulbMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    const bulb = BABYLON.MeshBuilder.CreateSphere("ff-title-bulb", { diameter: 0.55, segments: 8 }, scene);
    bulb.material = bulbMaterial;
    bulb.isVisible = false;
    const inset = 0.7;
    const left = centerX - (width / 2) + inset;
    const right = centerX + (width / 2) - inset;
    const bottom = centerY - (height / 2) + inset;
    const top = centerY + (height / 2) - inset;
    const perimeter: [number, number][] = [];
    const spacing = 1.6;
    const along = (x0: number, y0: number, x1: number, y1: number) => {
        const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / spacing));
        for (let i = 0; i < steps; i++) {
            perimeter.push([x0 + (((x1 - x0) * i) / steps), y0 + (((y1 - y0) * i) / steps)]);
        }
    };
    along(left, bottom, right, bottom);
    along(right, bottom, right, top);
    along(right, top, left, top);
    along(left, top, left, bottom);
    perimeter.forEach(([x, y], i) => {
        const instance = bulb.createInstance(`ff-title-bulb-${i}`);
        instance.position.set(x, y, boardFront + 0.12);
        instance.isPickable = false;
    });

    // Toy fruit sitting on top of the board.
    const fruitY = centerY + (height / 2) + 0.6;
    createApple(scene, "ff-title-apple", new BABYLON.Vector3(centerX - (width * 0.32), fruitY + 1.1, boardZ), 1.2);
    createOrange(scene, "ff-title-orange", new BABYLON.Vector3(centerX - (width * 0.12), fruitY + 1, boardZ), 1.1);
    createCherries(scene, "ff-title-cherries", new BABYLON.Vector3(centerX + (width * 0.12), fruitY + 0.6, boardZ));
    createPear(scene, "ff-title-pear", new BABYLON.Vector3(centerX + (width * 0.32), fruitY + 1, boardZ), 1);

    for (const mesh of [board, rim]) {
        mesh.isPickable = false;
    }
}

function fruitMaterial(scene: BABYLON.Scene, name: string, hex: string): BABYLON.Material {
    return scene.getMaterialByName(name) ?? createToyMaterial(scene, name, hex, { roughness: 0.35, clearCoat: 0.7 });
}

function addStemAndLeaf(scene: BABYLON.Scene, name: string, top: BABYLON.Vector3, size: number, leafAngle: number): void {
    const stem = BABYLON.MeshBuilder.CreateCylinder(`${name}-stem`, { diameterTop: 0.12 * size, diameterBottom: 0.2 * size, height: 0.8 * size, tessellation: 8 }, scene);
    stem.material = fruitMaterial(scene, "ff-fruit-stem", PALETTE.stem);
    stem.position.set(top.x, top.y + (0.3 * size), top.z);
    stem.rotation.z = 0.25;
    const leaf = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf`, { diameter: 1, segments: 8 }, scene);
    leaf.material = fruitMaterial(scene, "ff-fruit-leaf", PALETTE.leaf);
    leaf.scaling.set(0.7 * size, 0.12 * size, 0.35 * size);
    leaf.rotation.set(0, leafAngle, 0.5);
    leaf.position.set(top.x + (0.35 * size), top.y + (0.45 * size), top.z);
}

function createApple(scene: BABYLON.Scene, name: string, center: BABYLON.Vector3, size: number): void {
    const apple = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 2 * size, segments: 20 }, scene);
    apple.material = fruitMaterial(scene, "ff-fruit-apple", PALETTE.apple);
    apple.scaling.y = 0.9;
    apple.position.copyFrom(center);
    addStemAndLeaf(scene, name, center.add(new BABYLON.Vector3(0, 0.85 * size, 0)), size, 0.4);
}

function createOrange(scene: BABYLON.Scene, name: string, center: BABYLON.Vector3, size: number): void {
    const orange = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 2 * size, segments: 20 }, scene);
    orange.material = fruitMaterial(scene, "ff-fruit-orange", PALETTE.orange);
    orange.position.copyFrom(center);
    const leaf = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf`, { diameter: 1, segments: 8 }, scene);
    leaf.material = fruitMaterial(scene, "ff-fruit-leaf", PALETTE.leaf);
    leaf.scaling.set(0.6 * size, 0.12 * size, 0.3 * size);
    leaf.rotation.z = -0.3;
    leaf.position.set(center.x + (0.25 * size), center.y + (1.02 * size), center.z);
}

function createCherries(scene: BABYLON.Scene, name: string, base: BABYLON.Vector3): void {
    const material = fruitMaterial(scene, "ff-fruit-apple", PALETTE.apple);
    const stemMaterial = fruitMaterial(scene, "ff-fruit-leaf", PALETTE.leaf);
    const joint = base.add(new BABYLON.Vector3(0, 2.2, 0));
    for (const side of [-1, 1]) {
        const cherry = BABYLON.MeshBuilder.CreateSphere(`${name}-${side}`, { diameter: 1.2, segments: 14 }, scene);
        cherry.material = material;
        const position = base.add(new BABYLON.Vector3(side * 0.65, 0, 0));
        cherry.position.copyFrom(position);
        // Stem from the cherry's top to the shared joint.
        const from = position.add(new BABYLON.Vector3(0, 0.5, 0));
        const stem = BABYLON.MeshBuilder.CreateTube(`${name}-stem-${side}`, {
            path: [from, BABYLON.Vector3.Lerp(from, joint, 0.5).add(new BABYLON.Vector3(side * 0.25, 0.1, 0)), joint],
            radius: 0.07,
            tessellation: 6,
        }, scene);
        stem.material = stemMaterial;
    }
    const leaf = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf`, { diameter: 1, segments: 8 }, scene);
    leaf.material = stemMaterial;
    leaf.scaling.set(0.8, 0.12, 0.4);
    leaf.rotation.z = 0.4;
    leaf.position.set(joint.x + 0.4, joint.y + 0.1, joint.z);
}

function createPear(scene: BABYLON.Scene, name: string, center: BABYLON.Vector3, size: number): void {
    const material = fruitMaterial(scene, "ff-fruit-pear", PALETTE.pear);
    const body = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 2 * size, segments: 18 }, scene);
    body.material = material;
    body.position.copyFrom(center);
    const neck = BABYLON.MeshBuilder.CreateSphere(`${name}-neck`, { diameter: 1.3 * size, segments: 16 }, scene);
    neck.material = material;
    neck.position.set(center.x, center.y + (1.05 * size), center.z);
    addStemAndLeaf(scene, name, center.add(new BABYLON.Vector3(0, 1.55 * size, 0)), size * 0.9, -0.5);
}

// ==================================================================== Info stand

function createInfoStand(scene: BABYLON.Scene): void {
    const panelWidth = 22;
    const panelHeight = 13;
    const tilt = (40 * Math.PI) / 180;
    const bottomY = 1.6;

    const root = new BABYLON.TransformNode("ff-info-stand", scene);
    root.position.set(INFO_STAND_POSITION.x, GROUND_Y, INFO_STAND_POSITION.y);
    root.rotation.y = FACE_CAMERA_YAW;

    // The panel leans back, so it faces up towards the camera (which looks down at ~30°).
    const panel = new BABYLON.TransformNode("ff-info-panel", scene);
    panel.parent = root;
    panel.position.set(0, bottomY + ((panelHeight / 2) * Math.cos(tilt)), (panelHeight / 2) * Math.sin(tilt));
    panel.rotation.x = tilt;

    const frame = createRoundedBox("ff-info-frame", panelWidth + 1.4, panelHeight + 1.4, 0.7, 0.6, scene);
    frame.material = createToyMaterial(scene, "ff-info-frame", PALETTE.navy, { roughness: 0.45, clearCoat: 0.4 });
    frame.parent = panel;
    frame.position.z = 0.35;

    const face = BABYLON.MeshBuilder.CreatePlane("ff-info-face", { width: panelWidth, height: panelHeight }, scene);
    face.material = createInfoMaterial(scene, panelWidth, panelHeight);
    face.parent = panel;
    face.position.z = -0.03;

    // Two legs behind the panel and a little foot at the front edge of each.
    const legMaterial = createToyMaterial(scene, "ff-info-leg", PALETTE.post, { roughness: 0.55, clearCoat: 0.3 });
    const legZ = (panelHeight / 2) * Math.sin(tilt) + 0.8;
    const legHeight = panel.position.y;
    for (const side of [-1, 1]) {
        const leg = createRoundedBox(`ff-info-leg-${side}`, 0.9, legHeight, 0.9, 0.3, scene);
        leg.material = legMaterial;
        leg.parent = root;
        leg.position.set(side * (panelWidth / 2 - 2.5), legHeight / 2, legZ);
        const foot = createRoundedBox(`ff-info-foot-${side}`, 1.4, 0.6, legZ + 1.5, 0.25, scene);
        foot.material = legMaterial;
        foot.parent = root;
        foot.position.set(side * (panelWidth / 2 - 2.5), 0.3, legZ / 2);
    }

    for (const mesh of root.getChildMeshes()) {
        mesh.isPickable = false;
    }

    // Solid, so the tank bumps into it.
    root.computeWorldMatrix(true);
    const center = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, 4, legZ / 2), root.getWorldMatrix());
    addStaticBox(scene, center, panelWidth + 1.4, 8, legZ + 3, { rotation: BABYLON.Quaternion.RotationYawPitchRoll(FACE_CAMERA_YAW, 0, 0) });
}

/** The panel's face: title, description, a "Free on Google Play" pill and a few drawn fruits. */
function createInfoMaterial(scene: BABYLON.Scene, panelWidth: number, panelHeight: number): BABYLON.StandardMaterial {
    const width = 1024;
    const height = Math.round((width * panelHeight) / panelWidth);
    const texture = new BABYLON.DynamicTexture("ff-info-texture", { width, height }, scene, true);
    const context = texture.getContext() as CanvasRenderingContext2D;

    const draw = () => {
        context.fillStyle = PALETTE.cream;
        context.fillRect(0, 0, width, height);
        const pad = 64;
        context.textAlign = "left";
        context.textBaseline = "alphabetic";

        context.fillStyle = PALETTE.pink;
        context.font = `900 34px ${FONT}`;
        context.fillText("MY PROJECTS", pad, 96);

        context.fillStyle = PALETTE.navy;
        context.font = `900 74px ${FONT}`;
        context.fillText("Idle Fruit Factory", pad, 190);

        context.fillStyle = PALETTE.muted;
        context.font = `800 40px ${FONT}`;
        const lines = wrapText(context, "My first Android mobile game. Download it for free on the Google Play Store.", 580);
        lines.forEach((line, i) => context.fillText(line, pad, 262 + (i * 52)));

        // Pill badge.
        const pillY = 262 + (lines.length * 52) + 18;
        const pillHeight = 76;
        context.font = `900 36px ${FONT}`;
        const pillText = "Free on Google Play";
        const pillWidth = context.measureText(pillText).width + 120;
        roundRect(context, pad, pillY, pillWidth, pillHeight, pillHeight / 2);
        context.fillStyle = PALETTE.navy;
        context.fill();
        context.fillStyle = PALETTE.cream;
        // Little "play" triangle.
        context.beginPath();
        context.moveTo(pad + 34, pillY + 22);
        context.lineTo(pad + 60, pillY + (pillHeight / 2));
        context.lineTo(pad + 34, pillY + pillHeight - 22);
        context.closePath();
        context.fill();
        context.fillText(pillText, pad + 80, pillY + 50);

        // Fruit doodles on the right.
        drawApple(context, 890, 200, 72);
        drawOrange(context, 820, 410, 60);
        drawCherries(context, 935, 420);
        texture.update();
    };
    draw();
    // Redraw with the rounded web font once it has loaded.
    if ("fonts" in document) {
        void document.fonts.load(`900 40px Nunito`).then(draw).catch(() => undefined);
    }

    const material = new BABYLON.StandardMaterial("ff-info-material", scene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    material.emissiveColor = new BABYLON.Color3(0.22, 0.22, 0.22);
    return material;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) {
        lines.push(line);
    }
    return lines;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
}

function drawLeaf(context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number): void {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = PALETTE.leaf;
    context.beginPath();
    context.ellipse(size / 2, 0, size / 2, size / 4.5, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawApple(context: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    context.fillStyle = PALETTE.stem;
    context.fillRect(x - 5, y - r - 26, 10, 34);
    drawLeaf(context, x + 6, y - r - 12, 56, -0.5);
    context.fillStyle = PALETTE.apple;
    context.beginPath();
    context.ellipse(x, y, r, r * 0.92, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.35)";
    context.beginPath();
    context.ellipse(x - (r * 0.38), y - (r * 0.35), r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    context.fill();
}

function drawOrange(context: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    context.fillStyle = PALETTE.orange;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    drawLeaf(context, x + 4, y - r + 4, 46, -0.3);
    context.fillStyle = "rgba(255,255,255,0.3)";
    context.beginPath();
    context.ellipse(x - (r * 0.35), y - (r * 0.35), r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2);
    context.fill();
}

function drawCherries(context: CanvasRenderingContext2D, x: number, y: number): void {
    context.strokeStyle = PALETTE.leaf;
    context.lineWidth = 7;
    context.lineCap = "round";
    for (const side of [-1, 1]) {
        context.beginPath();
        context.moveTo(x + (side * 30), y);
        context.quadraticCurveTo(x + (side * 14), y - 60, x + 6, y - 96);
        context.stroke();
    }
    drawLeaf(context, x + 6, y - 96, 44, -0.2);
    context.fillStyle = PALETTE.apple;
    for (const side of [-1, 1]) {
        context.beginPath();
        context.arc(x + (side * 30), y + 18, 30, 0, Math.PI * 2);
        context.fill();
    }
}

import * as BABYLON from "@babylonjs/core";

import { addStaticBox } from "../core/staticBodies";
import { createRoundedBox, createToyMaterial } from "../core/toyStyle";
import { GROUND_Y, FACE_CAMERA_YAW } from "../core/constants";

/**
 * A tilted info stand facing the camera: a navy-framed panel leaning back on two wooden legs, with
 * a face drawn on a canvas (cream background, text, doodles). Used for the project and work
 * descriptions.
 */

const PALETTE = {
    frame: "#344B63",
    leg: "#8B6A50",
    face: "#F4EBDD",
};

/** The face is drawn on a canvas this many pixels wide. */
export const INFO_FACE_WIDTH = 1024;

export type InfoStandOptions = {
    id: string;
    /** World position on the ground (x, z). */
    x: number;
    z: number;
    width?: number;
    height?: number;
    /** Draws the face (the background is already filled). Called again once the web font loads. */
    draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
};

export function createInfoStand(scene: BABYLON.Scene, options: InfoStandOptions): BABYLON.TransformNode {
    const { id } = options;
    const panelWidth = options.width ?? 22;
    const panelHeight = options.height ?? 13;
    const tilt = (40 * Math.PI) / 180;
    const bottomY = 1.6;

    const root = new BABYLON.TransformNode(id, scene);
    root.position.set(options.x, GROUND_Y, options.z);
    root.rotation.y = FACE_CAMERA_YAW;

    // The panel leans back, so it faces up towards the camera (which looks down at ~30°).
    const panel = new BABYLON.TransformNode(`${id}-panel`, scene);
    panel.parent = root;
    panel.position.set(0, bottomY + ((panelHeight / 2) * Math.cos(tilt)), (panelHeight / 2) * Math.sin(tilt));
    panel.rotation.x = tilt;

    const frame = createRoundedBox(`${id}-frame`, panelWidth + 1.4, panelHeight + 1.4, 0.7, 0.6, scene);
    frame.material = scene.getMaterialByName("info-stand-frame") ?? createToyMaterial(scene, "info-stand-frame", PALETTE.frame, { roughness: 0.45, clearCoat: 0.4 });
    frame.parent = panel;
    frame.position.z = 0.35;

    const face = BABYLON.MeshBuilder.CreatePlane(`${id}-face`, { width: panelWidth, height: panelHeight }, scene);
    face.material = createFaceMaterial(scene, id, panelWidth, panelHeight, options.draw);
    face.parent = panel;
    face.position.z = -0.03;

    // Two legs behind the panel and a little foot at the front edge of each.
    const legMaterial = scene.getMaterialByName("info-stand-leg") ?? createToyMaterial(scene, "info-stand-leg", PALETTE.leg, { roughness: 0.55, clearCoat: 0.3 });
    const legZ = (panelHeight / 2) * Math.sin(tilt) + 0.8;
    const legHeight = panel.position.y;
    for (const side of [-1, 1]) {
        const leg = createRoundedBox(`${id}-leg-${side}`, 0.9, legHeight, 0.9, 0.3, scene);
        leg.material = legMaterial;
        leg.parent = root;
        leg.position.set(side * (panelWidth / 2 - 2.5), legHeight / 2, legZ);
        const foot = createRoundedBox(`${id}-foot-${side}`, 1.4, 0.6, legZ + 1.5, 0.25, scene);
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
    addStaticBox(scene, center, panelWidth + 1.4, 8, legZ + 3, { rotation: BABYLON.Quaternion.RotationYawPitchRoll(FACE_CAMERA_YAW, 0, 0), sound: "solid" });
    return root;
}

function createFaceMaterial(scene: BABYLON.Scene, id: string, panelWidth: number, panelHeight: number, draw: InfoStandOptions["draw"]): BABYLON.StandardMaterial {
    const width = INFO_FACE_WIDTH;
    const height = Math.round((width * panelHeight) / panelWidth);
    const texture = new BABYLON.DynamicTexture(`${id}-texture`, { width, height }, scene, true);
    const context = texture.getContext() as CanvasRenderingContext2D;

    const redraw = () => {
        context.fillStyle = PALETTE.face;
        context.fillRect(0, 0, width, height);
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
        draw(context, width, height);
        texture.update();
    };
    redraw();
    // Redraw with the rounded web font once it has loaded.
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(redraw).catch(() => undefined);
    }

    const material = new BABYLON.StandardMaterial(`${id}-material`, scene);
    material.diffuseTexture = texture;
    material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    material.emissiveColor = new BABYLON.Color3(0.22, 0.22, 0.22);
    return material;
}

/** Splits `text` into lines no wider than `maxWidth` in the context's current font. */
export function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

export function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
}

/**
 * The standard layout: a small coloured eyebrow, a big title (shrunk to fit `maxWidth`), and a
 * wrapped description. Returns the y just below the description, for whatever comes next.
 */
export function drawInfoText(context: CanvasRenderingContext2D, font: string, text: {
    eyebrow: string;
    eyebrowColor: string;
    title: string;
    titleColor: string;
    body: string;
    bodyColor: string;
    maxWidth: number;
}): number {
    const pad = 64;
    context.fillStyle = text.eyebrowColor;
    context.font = `900 34px ${font}`;
    context.fillText(text.eyebrow, pad, 96);

    let titleSize = 74;
    context.font = `900 ${titleSize}px ${font}`;
    while (titleSize > 40 && context.measureText(text.title).width > text.maxWidth + 120) {
        titleSize -= 2;
        context.font = `900 ${titleSize}px ${font}`;
    }
    context.fillStyle = text.titleColor;
    context.fillText(text.title, pad, 190);

    context.fillStyle = text.bodyColor;
    context.font = `800 40px ${font}`;
    const lines = wrapText(context, text.body, text.maxWidth);
    lines.forEach((line, i) => context.fillText(line, pad, 262 + (i * 52)));
    return 262 + (lines.length * 52);
}

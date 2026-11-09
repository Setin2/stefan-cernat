import * as BABYLON from "../babylon";

import { getSoundMaterial } from "../audio/soundMaterials";
import { addStaticBox } from "../core/staticBodies";
import { createRoundedBox, createToyMaterial } from "../core/toyStyle";
import { GROUND_Y } from "../core/constants";
import { UI } from "../ui/style";

/**
 * A big round arcade button on a post, facing the camera, used by the minigames: shoot it to press
 * it (the tank driving into it just bumps). A navy rim round a coloured cap with a label (a small
 * symbol over a word); the cap sinks in when pressed and comes back out slowly.
 */

export type ArcadeButton = {
    /** World position of the button's face. */
    position: BABYLON.Vector3;
    /** Fires when a shot hits the button. */
    onHit: BABYLON.Observable<void>;
    /** Plays the press animation. */
    press: () => void;
};

export type ArcadeButtonOptions = {
    id: string;
    /** World position on the ground (x, z), and which way it faces (its front faces local -Z). */
    x: number;
    z: number;
    yaw: number;
    color: string;
    /** Small symbol over the label, e.g. "▲". */
    symbol: string;
    label: string;
    scale?: number;
};

const PALETTE = {
    rim: "#344B63",
    base: "#E8DCC6",
    post: "#8B6A50",
    letters: "#22313F",
};

const DISC_Y = 6.2;

export function createArcadeButton(scene: BABYLON.Scene, options: ArcadeButtonOptions): ArcadeButton {
    const { id } = options;
    const shared = (name: string, hex: string) => scene.getMaterialByName(name) ?? createToyMaterial(scene, name, hex, { roughness: 0.45, clearCoat: 0.4 });

    const root = new BABYLON.TransformNode(id, scene);
    root.position.set(options.x, GROUND_Y, options.z);
    root.rotation.y = options.yaw;
    root.scaling.setAll(options.scale ?? 1.2);

    const add = (mesh: BABYLON.Mesh, parent: BABYLON.Node, material: BABYLON.Material, moving = false) => {
        mesh.parent = parent;
        mesh.material = material;
        mesh.isPickable = false;
        if (moving) {
            mesh.metadata = { ...(mesh.metadata ?? {}), keepUnfrozen: true };
        }
        return mesh;
    };

    add(createRoundedBox(`${id}-base`, 2.8, 0.6, 2.8, 0.25, scene), root, shared("arcade-button-base", PALETTE.base)).position.y = 0.3;
    add(createRoundedBox(`${id}-post`, 0.8, DISC_Y, 0.8, 0.3, scene), root, shared("arcade-button-post", PALETTE.post)).position.set(0, (DISC_Y / 2) + 0.3, 0.6);

    // Cylinders stand along Y; tip them so their faces point at the camera (-Z).
    const holder = new BABYLON.TransformNode(`${id}-holder`, scene);
    holder.parent = root;
    holder.position.set(0, DISC_Y, 0);
    holder.rotation.x = -Math.PI / 2;
    add(BABYLON.MeshBuilder.CreateCylinder(`${id}-rim`, { diameter: 5, height: 0.8, tessellation: 40 }, scene), holder, shared("arcade-button-rim", PALETTE.rim)).position.y = 0.1;

    // The cap is what moves in when the button is pressed.
    const cap = new BABYLON.TransformNode(`${id}-cap`, scene);
    cap.parent = holder;
    const faceMaterial = shared(`arcade-button-face-${options.color}`, options.color);
    add(BABYLON.MeshBuilder.CreateCylinder(`${id}-face`, { diameter: 4.1, height: 0.7, tessellation: 40 }, scene), cap, faceMaterial, true).position.y = 0.6;
    const label = createLabel(scene, `${id}-label`, options.symbol, options.label);
    label.parent = cap;
    label.position.y = 0.97;
    label.rotation.x = Math.PI / 2;
    label.metadata = { keepUnfrozen: true };

    const onHit = new BABYLON.Observable<void>();
    root.computeWorldMatrix(true);
    const scale = root.scaling.x;
    const world = root.getWorldMatrix();
    const position = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, DISC_Y, -0.5), world);
    const rotation = BABYLON.Quaternion.RotationYawPitchRoll(options.yaw, 0, 0);
    addStaticBox(scene, position, 5 * scale, 5 * scale, 1.6 * scale, {
        rotation,
        sound: "post",
        onHit: (body) => {
            if (getSoundMaterial(body) === "ball") {
                onHit.notifyObservers();
            }
        },
    });
    addStaticBox(scene, BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, DISC_Y / 2, 0.6), world), 1.2 * scale, DISC_Y * scale, 1.2 * scale, { rotation, sound: "post" });

    // The press animation only runs while the cap is moving.
    let pressed = 0;
    let observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
    const animate = () => {
        const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        pressed = Math.max(0, pressed - (dt * 3));
        // In fast, back out slowly.
        cap.position.y = -0.45 * Math.sin(Math.min(1, pressed) * Math.PI * 0.5);
        if (pressed <= 0) {
            scene.onBeforeRenderObservable.remove(observer);
            observer = null;
        }
    };
    return {
        position,
        onHit,
        press: () => {
            pressed = 1;
            observer ??= scene.onBeforeRenderObservable.add(animate);
        },
    };
}

function createLabel(scene: BABYLON.Scene, name: string, symbol: string, text: string): BABYLON.Mesh {
    const size = 256;
    const texture = new BABYLON.DynamicTexture(`${name}-texture`, { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    const draw = () => {
        context.clearRect(0, 0, size, size);
        context.fillStyle = PALETTE.letters;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `900 54px ${UI.font}`;
        context.fillText(symbol, size / 2, size * 0.32);
        context.font = `900 ${text.length > 3 ? 70 : 80}px ${UI.font}`;
        context.fillText(text, size / 2, size * 0.64);
        texture.update();
    };
    draw();
    if ("fonts" in document) {
        void document.fonts.load("900 40px Nunito").then(draw).catch(() => undefined);
    }
    const material = new BABYLON.StandardMaterial(`${name}-material`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { size: 3.4 }, scene);
    plane.material = material;
    plane.isPickable = false;
    return plane;
}

import * as BABYLON from "@babylonjs/core";

import { createToyMaterial } from "./toyStyle";

/**
 * Toy-style shooting target: a navy backing disc with a rim, raised concentric rings that step up
 * towards a gold bullseye, and the platform's mark on the bullseye. It gives a small knock when hit.
 *
 * It is built as a child of the original target mesh (in that mesh's local space, where the disc
 * lies in the X/Z plane and +Y faces the player), so it inherits the target's position and size.
 * The original mesh stays in place, hidden, and is still used for hit tests and the labels.
 */

export type ToyTarget = {
    /** Visible meshes, e.g. for the highlight glow. */
    meshes: BABYLON.Mesh[];
    /** Plays the hit knock. */
    hit: () => void;
};

const PALETTE = {
    backing: "#344B63",
    rim: "#E8DCC6",
    light: "#F4EBDD",
    accent: "#E8869F",
    bullseye: "#C9A35B",
    mark: "#344B63",
};

/** Rings from the outside in: radius, colour, and how far the ring's face stands out. */
const RINGS: { radius: number; color: keyof typeof PALETTE; top: number }[] = [
    { radius: 1.7, color: "light", top: 0.16 },
    { radius: 1.36, color: "accent", top: 0.22 },
    { radius: 1.02, color: "light", top: 0.28 },
    { radius: 0.7, color: "accent", top: 0.34 },
    { radius: 0.4, color: "bullseye", top: 0.42 },
];

const materialCache = new WeakMap<BABYLON.Scene, Record<keyof typeof PALETTE, BABYLON.Material>>();

function getMaterials(scene: BABYLON.Scene): Record<keyof typeof PALETTE, BABYLON.Material> {
    let materials = materialCache.get(scene);
    if (!materials) {
        materials = {
            backing: createToyMaterial(scene, "toy-target-backing", PALETTE.backing, { roughness: 0.45, clearCoat: 0.4 }),
            rim: createToyMaterial(scene, "toy-target-rim", PALETTE.rim, { roughness: 0.45, clearCoat: 0.4 }),
            light: createToyMaterial(scene, "toy-target-light", PALETTE.light, { roughness: 0.4, clearCoat: 0.6 }),
            accent: createToyMaterial(scene, "toy-target-accent", PALETTE.accent, { roughness: 0.4, clearCoat: 0.6 }),
            bullseye: createToyMaterial(scene, "toy-target-bullseye", PALETTE.bullseye, { roughness: 0.25, metallic: 0.6, clearCoat: 0.6 }),
            mark: createToyMaterial(scene, "toy-target-mark", PALETTE.mark, { roughness: 0.4, clearCoat: 0.4 }),
        };
        materialCache.set(scene, materials);
    }
    return materials;
}

export function createToyTarget(scene: BABYLON.Scene, target: BABYLON.Mesh, mark: string): ToyTarget | null {
    const materials = getMaterials(scene);
    const meshes: BABYLON.Mesh[] = [];
    const add = (mesh: BABYLON.Mesh) => {
        mesh.isPickable = false;
        meshes.push(mesh);
        return mesh;
    };

    // Everything hangs off this node so the whole target can move when hit.
    const root = new BABYLON.TransformNode(`${target.name}-toy`, scene);
    root.parent = target;

    // Backing disc with a bevelled edge (a short cone on top of a cylinder) and a sand rim.
    const backing = add(BABYLON.MeshBuilder.CreateCylinder(`${target.name}-backing`, { diameter: 3.8, height: 0.45, tessellation: 48 }, scene));
    backing.material = materials.backing;
    backing.parent = root;
    backing.position.y = -0.2;

    const bevel = add(BABYLON.MeshBuilder.CreateCylinder(`${target.name}-bevel`, { diameterBottom: 3.8, diameterTop: 3.55, height: 0.14, tessellation: 48 }, scene));
    bevel.material = materials.backing;
    bevel.parent = root;
    bevel.position.y = 0.09;

    const rim = add(BABYLON.MeshBuilder.CreateTorus(`${target.name}-rim`, { diameter: 3.8, thickness: 0.26, tessellation: 48 }, scene));
    rim.material = materials.rim;
    rim.parent = root;
    rim.position.y = -0.2;

    // Raised rings, each a little taller than the one around it.
    for (const ring of RINGS) {
        const height = ring.top + 0.05;
        const disc = add(BABYLON.MeshBuilder.CreateCylinder(`${target.name}-ring-${ring.radius}`, {
            diameterTop: (ring.radius * 2) - 0.06,
            diameterBottom: ring.radius * 2,
            height,
            tessellation: 48,
        }, scene));
        disc.material = materials[ring.color];
        disc.parent = root;
        disc.position.y = ring.top - (height / 2);
    }

    // The platform's mark on the bullseye.
    const label = createMarkPlane(scene, `${target.name}-mark`, mark);
    if (label) {
        label.parent = root;
        label.position.y = RINGS[RINGS.length - 1].top + 0.01;
        // Not added to `meshes`: the highlight glow would outline the whole square plane.
    }

    // Two little brackets at the back, as if it's screwed onto the podium.
    for (const side of [-1, 1]) {
        const bracket = add(BABYLON.MeshBuilder.CreateBox(`${target.name}-bracket-${side}`, { width: 0.5, height: 0.5, depth: 0.9 }, scene));
        bracket.material = materials.rim;
        bracket.parent = root;
        bracket.position.set(0, -0.5, side * 1.2);
    }

    target.isVisible = false;

    // Hit feedback without any rotation: the target is knocked slightly back (along -Y, into the
    // podium) and springs back to its place.
    let hitTime = -1;
    const observer = scene.onBeforeRenderObservable.add(() => {
        if (hitTime < 0) {
            return;
        }
        hitTime += scene.getEngine().getDeltaTime() / 1000;
        const push = 0.12 * Math.exp(-hitTime * 9) * Math.cos(hitTime * 14);
        root.position.y = -push;
        if (hitTime > 0.6) {
            root.position.y = 0;
            hitTime = -1;
        }
    });
    target.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(observer));

    return {
        meshes,
        hit: () => {
            hitTime = 0;
        },
    };
}

/**
 * A small flat plane lying on the bullseye with the mark drawn on it. The plane is rotated to lie
 * in the disc (facing +Y, the player).
 */
function createMarkPlane(scene: BABYLON.Scene, name: string, mark: string): BABYLON.Mesh | null {
    if (!mark) {
        return null;
    }

    const size = 256;
    const texture = new BABYLON.DynamicTexture(`${name}-texture`, { width: size, height: size }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, size, size);
    context.fillStyle = PALETTE.mark;
    const fontSize = mark.length > 1 ? size * 0.46 : size * 0.6;
    context.font = `900 ${fontSize}px "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(mark, size / 2, size * 0.54);
    texture.update();

    const material = new BABYLON.StandardMaterial(`${name}-material`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    material.zOffset = -2;

    const plane = BABYLON.MeshBuilder.CreatePlane(name, { size: 0.72 }, scene);
    plane.material = material;
    // A plane faces -Z; tip it back so it faces +Y (out of the target), and turn it half way
    // around so the text is upright (the target's local +Z points down in the world).
    plane.rotation.set(Math.PI / 2, Math.PI, 0);
    plane.isPickable = false;
    return plane;
}

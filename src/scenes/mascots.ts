import * as BABYLON from "@babylonjs/core";

import { createRoundedBox, createToyMaterial } from "./toyStyle";

/**
 * Gives the imported character models (the three small figures, the big sword and the big
 * symbol) the same toy finish as the rest of the world: glossy plastic materials in the site's
 * palette, plus a few small set pieces around them. Their geometry, positions and physics are
 * unchanged.
 */

const GROUND_Y = -0.5;

const PALETTE = {
    figureBodies: ["#4F6F8F", "#E8869F", "#D9A13B"],
    visor: "#A9D8EA",
    outline: "#22313F",
    steel: "#C9D2DA",
    symbolInside: "#E8869F",
    symbolOutside: "#344B63",
    sand: "#E8DCC6",
    stone: "#CFC1A8",
};

export function restyleMascots(scene: BABYLON.Scene): void {
    try {
        restyleFigures(scene);
    } catch (error) {
        console.error("Figure restyle failed, keeping the originals", error);
    }

    try {
        restyleSword(scene);
    } catch (error) {
        console.error("Sword restyle failed, keeping the original", error);
    }

    try {
        restyleSymbol(scene);
    } catch (error) {
        console.error("Symbol restyle failed, keeping the original", error);
    }
}

/**
 * Each figure is a hidden collider with three visible children: an outline shell (drawn with
 * flipped faces to give the cartoon outline), the body, and the visor (the smallest part).
 */
function restyleFigures(scene: BABYLON.Scene): void {
    const figures = scene.meshes.filter((mesh) => mesh.name === "amongus" && !mesh.parent);
    const visor = createToyMaterial(scene, "toy-figure-visor", PALETTE.visor, { roughness: 0.12, clearCoat: 1 });
    visor.emissiveColor = BABYLON.Color3.FromHexString(PALETTE.visor).toLinearSpace().scale(0.12);
    let outline: BABYLON.Material | null = null;

    figures.forEach((figure, index) => {
        const parts = figure.getChildMeshes();
        if (!parts.length) {
            return;
        }

        const body = createToyMaterial(scene, `toy-figure-body-${index}`, PALETTE.figureBodies[index % PALETTE.figureBodies.length], { roughness: 0.42, clearCoat: 0.6 });
        const smallest = parts.reduce((a, b) => (a.getTotalVertices() < b.getTotalVertices() ? a : b));

        for (const part of parts) {
            if (part.material?.name === "Outline.002") {
                // Keep the outline's flipped-face setup, just tint it navy instead of black.
                if (!outline && part.material instanceof BABYLON.PBRMaterial) {
                    const clone = part.material.clone("toy-figure-outline");
                    clone.albedoColor = BABYLON.Color3.FromHexString(PALETTE.outline).toLinearSpace();
                    outline = clone;
                }
                if (outline) {
                    part.material = outline;
                }
            } else if (part === smallest) {
                part.material = visor;
            } else {
                part.material = body;
            }
        }
    });
}

/** The sword in toy steel, with a ring of stones where it's stuck in the ground. */
function restyleSword(scene: BABYLON.Scene): void {
    const sword = scene.getMeshByName("berserk_sword");
    if (!sword) {
        return;
    }

    sword.material = createToyMaterial(scene, "toy-sword-steel", PALETTE.steel, { roughness: 0.25, metallic: 0.55, clearCoat: 0.6 });

    sword.computeWorldMatrix(true);
    const center = sword.getBoundingInfo().boundingBox.centerWorld;
    const stone = createToyMaterial(scene, "toy-sword-stone", PALETTE.stone, { roughness: 0.65, clearCoat: 0.15 });
    for (let i = 0; i < 7; i++) {
        const angle = ((i / 7) * Math.PI * 2) + 0.3;
        const rock = BABYLON.MeshBuilder.CreateSphere(`monument-sword-stone-${i}`, { diameter: 1, segments: 8 }, scene);
        rock.material = stone;
        const size = 1.2 + ((i % 3) * 0.45);
        rock.scaling.set(size, size * 0.5, size * 0.9);
        rock.position.set(center.x + (Math.cos(angle) * 3.6), GROUND_Y + 0.15, center.z + (Math.sin(angle) * 3.6));
        rock.isPickable = false;
    }
}

/** The symbol in glossy pink on navy, standing on a low sand plinth. */
function restyleSymbol(scene: BABYLON.Scene): void {
    const inside = scene.getMeshByName("berserk_symbol_inside");
    const outside = scene.getMeshByName("berserk_symbol_outside");
    if (inside) {
        inside.material = createToyMaterial(scene, "toy-symbol-inside", PALETTE.symbolInside, { roughness: 0.4, clearCoat: 0.6 });
    }
    if (!outside) {
        return;
    }
    outside.material = createToyMaterial(scene, "toy-symbol-outside", PALETTE.symbolOutside, { roughness: 0.45, clearCoat: 0.5 });

    // Low plinth under the symbol's footprint.
    outside.computeWorldMatrix(true);
    const box = outside.getBoundingInfo().boundingBox;
    const width = box.maximumWorld.x - box.minimumWorld.x;
    const depth = box.maximumWorld.z - box.minimumWorld.z;
    const plinth = createRoundedBox("monument-symbol-plinth", Math.min(width, 10) + 1, 1.2, Math.min(depth, 10) + 1, 0.5, scene);
    plinth.material = createToyMaterial(scene, "toy-symbol-plinth", PALETTE.sand, { roughness: 0.5, clearCoat: 0.35 });
    plinth.position.set(box.centerWorld.x, GROUND_Y + 0.5, box.centerWorld.z);
    plinth.isPickable = false;
}

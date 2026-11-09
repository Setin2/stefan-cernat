import * as BABYLON from "../babylon";

import { createRoundedBox, createToyMaterial } from "../core/toyStyle";
import { GROUND_Y } from "../core/constants";

/**
 * Gives the imported models (the big sword and the big symbol) the same toy finish as the rest
 * of the world: glossy plastic materials in the site's palette, plus a few small set pieces
 * around them. Their geometry, positions and physics are
 * unchanged.
 */

const PALETTE = {
    steel: "#C9D2DA",
    symbolInside: "#E8869F",
    symbolOutside: "#344B63",
    sand: "#E8DCC6",
    stone: "#CFC1A8",
};

export function restyleMascots(scene: BABYLON.Scene): void {
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

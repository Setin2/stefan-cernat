import type * as BABYLON from "@babylonjs/core";

/** Meshes that move without a physics body of their own. */
const MOVING_MESHES = new Set(["tank", "tank_holder"]);

/**
 * Cheap wins for a scene that is never clicked and is mostly static: no pointer picking, and
 * every mesh that never moves gets its world matrix frozen. Builders can opt a mesh out with
 * `mesh.metadata = { keepUnfrozen: true }` (for meshes they animate by hand).
 *
 * Materials are not frozen: frozen materials bind the light and shadow data only once, so the
 * shadow map (which follows the camera) would never show up on them.
 */
export function optimizeScene(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh): void {
    scene.getEngine().enableOfflineSupport = false;
    scene.blockMaterialDirtyMechanism = true;
    scene.collisionsEnabled = false;

    // The game is driven with the keyboard; mouse picking is never needed.
    scene.skipPointerMovePicking = true;
    scene.skipPointerDownPicking = true;
    scene.skipPointerUpPicking = true;
    scene.pointerMovePredicate = () => false;
    scene.pointerDownPredicate = () => false;
    scene.pointerUpPredicate = () => false;

    scene.meshes
        .filter((mesh) => !mesh.physicsImpostor && !MOVING_MESHES.has(mesh.name) && !mesh.isDescendantOf(tank) && !mesh.metadata?.keepUnfrozen)
        .forEach((mesh) => {
            mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true;
            mesh.freezeWorldMatrix();
        });
}

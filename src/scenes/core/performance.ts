import type * as BABYLON from "../babylon";

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
    // Babylon 9 re-checks every material's readiness for every mesh on every frame, about 3 ms a
    // frame with this many meshes. Materials here never change in ways that need a different
    // shader once they're on screen (the dirty mechanism above is blocked anyway; colours and
    // visibility are uniforms), so one check per mesh is enough. Not for materials with a depth
    // pre-pass (the clouds): that pass has a shader of its own, which then never gets made, and
    // they render black. Materials created later (the minigames, shots) get it after their first
    // frame, once all their settings are in.
    const checkOnce = (material: BABYLON.Material) => {
        if (!material.needDepthPrePass) {
            material.checkReadyOnlyOnce = true;
        }
    };
    scene.materials.forEach(checkOnce);
    scene.onNewMaterialAddedObservable.add((material) => {
        scene.onAfterRenderObservable.addOnce(() => checkOnce(material));
    });

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

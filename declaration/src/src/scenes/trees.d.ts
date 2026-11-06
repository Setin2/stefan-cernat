import * as BABYLON from "@babylonjs/core";
/**
 * Toy-style cherry blossom trees: a smooth tapered trunk with a root flare and two branches, a
 * canopy made of soft lumpy "puffs" in a few pinks dotted with blossoms, a gentle sway, and petals
 * drifting down.
 *
 * Only the trunk ("tree-trunk-*") has a physics body and is used by the tank's tree collision, and
 * its size matches the previous trees, so gameplay is unchanged. Other parts must not be named
 * "tree-trunk*".
 */
type TreeContext = {
    scene: BABYLON.Scene;
};
export declare function instantiateTrees(_this: TreeContext): void;
export {};

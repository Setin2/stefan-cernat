import * as BABYLON from "@babylonjs/core";
type BrickContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    brickSound: BABYLON.Sound;
};
/**
 * Set up a wall of bricks centered at (x, z) and rotated around its own center.
 * @param y fallback ground height used if no ground is found below the wall.
 * @param rotationY rotation of the wall around its own vertical axis, in radians.
 */
export declare function instantiateBricks(_this: BrickContext, x: number, y: number, z: number, numRows: number, numColumnsPerRow: number[], rotationY?: number): void;
export {};

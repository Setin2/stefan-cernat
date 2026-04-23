import * as BABYLON from "@babylonjs/core";
type BrickContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    brickSound: BABYLON.Sound;
};
/**
 * Set up a wall of bricks in the scene at a specified position.
 */
export declare function instantiateBricks(_this: BrickContext, x: number, y: number, z: number, numRows: number, numColumnsPerRow: number[], rotationY?: number): void;
export {};

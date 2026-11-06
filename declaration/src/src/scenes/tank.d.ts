import * as BABYLON from "@babylonjs/core";
type TankContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    camera: BABYLON.FreeCamera;
    divFps: HTMLElement | null;
    tankSound: BABYLON.Sound;
    bullet: BABYLON.Sound;
    /** Called every time the tank fires (used by the toy tank model for recoil). */
    onShoot?: () => void;
    /** Where shots spawn, relative to the tank holder: distance forward and height. */
    shotOrigin?: {
        forward: number;
        height: number;
    };
};
/**
 * Initialize the movement of the player tank.
 */
export declare function initializeTankMovement(_this: TankContext, rotationSpeed: number): void;
/**
 * Gives the player the ability to shoot with the tank.
 */
export declare function initializeShooting(_this: TankContext, forward: BABYLON.Vector3): Promise<void>;
export {};

import type * as BABYLON from "@babylonjs/core";

/** What the tank controls need from the scene (see Play.play). */
export type TankContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    camera: BABYLON.FreeCamera;
    tankSound: BABYLON.Sound;
    bullet: BABYLON.Sound;
    /** Called every time the tank fires (used by the toy tank model for recoil). */
    onShoot?: () => void;
    /** Where shots spawn, relative to the tank holder: distance forward and height. */
    shotOrigin?: { forward: number; height: number };
};

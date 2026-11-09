import type * as BABYLON from "../babylon";

import type { ImpactSounds } from "../audio/impactSounds";
import type { SoundBoard } from "../audio/soundBoard";
import type { TankInput } from "./input";

/** What the tank controls need from the scene (see Play.play). */
export type TankContext = {
    scene: BABYLON.Scene;
    tank: BABYLON.AbstractMesh;
    camera: BABYLON.FreeCamera;
    sounds: SoundBoard;
    impacts: ImpactSounds;
    /** Touch (or other non-keyboard) driving and firing. */
    input: TankInput;
    /** Called every time the tank fires (used by the toy tank model for recoil). */
    onShoot?: () => void;
    /** Where shots spawn, relative to the tank holder: distance forward and height. */
    shotOrigin?: { forward: number; height: number };
};

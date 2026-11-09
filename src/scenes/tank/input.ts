import * as BABYLON from "../babylon";

/**
 * Driving and firing input that doesn't come from the keyboard: the on-screen touch controls
 * (ui/touchControls.ts). Movement and shooting read it alongside the keys.
 */
export type TankInput = {
    /** Forwards (1) to backwards (-1); in between drives slower. */
    move: number;
    /** Right (1) to left (-1). */
    turn: number;
    /** Fires a shot (the keyboard's E). */
    onFire: BABYLON.Observable<void>;
};

export function createTankInput(): TankInput {
    return { move: 0, turn: 0, onFire: new BABYLON.Observable<void>() };
}

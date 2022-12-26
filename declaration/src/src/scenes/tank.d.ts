import { Node } from "@babylonjs/core/node";
export default class Tank extends Node {
    private tank;
    private scene;
    private camera;
    private bullet;
    private tank_sound;
    private brick_sound;
    /**
     * Override constructor.
     * @warn do not fill.
     */
    protected constructor();
    onInitialized(): void;
    tankMovement(_this: any, forward: any, backward: any, rotationSpeed: any): void;
    initializeShooting(_this: any, forward: any): void;
}

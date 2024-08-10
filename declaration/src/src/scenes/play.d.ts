import { Node } from "@babylonjs/core/node";
import * as BABYLON from "@babylonjs/core";
import 'babylonjs-loaders';
export default class Play extends Node {
    private scene;
    private camera;
    private bullet;
    private tankSound;
    private brickSound;
    private tank;
    private divFps;
    protected constructor(name: string, scene: BABYLON.Scene);
    static createInstance(name: string, scene: BABYLON.Scene): Play;
    /**
     * Called on the node is being initialized.
     * This function is called immediatly after the constructor has been called.
     */
    onInitialize(): void;
    /**
     * Might add other easter eggs later if I feel like it
     */
    easterEgg(): void;
    /**
     * Initialize constant variables and functionalities of the game
     */
    play(): void;
    /**
     * Add image telling the player how to control the tank (+ under developement text)
     */
    show_Control(): void;
    /**
     * Initialize the movement of the player tank.
     */
    initializeTankMovement(_this: this, rotationSpeed: number): void;
    /**
     * Create and return splatter objects.
     */
    private createSplatterObjects;
    /**
     * Gives the player the ability to shoot with the tank.
     */
    initializeShooting(_this: this, forward: BABYLON.Vector3): void;
    /**
     * Set up a wall of bricks in the scene at a specified position.
     */
    instantiateBricks(x: number, y: number, z: number): void;
    /**
     * Creates a brick mesh with the given dimensions.
     */
    private createBrick;
    /**
     * Positions and sets up physics properties for a brick.
     */
    private positionBrick;
    /**
     * Determines the number of bricks in the current row based on its index.
     */
    private getBricksPerRow;
    /**
     * Instantiates clones of the sakura tree to save memory and allow dynamic placement.
     */
    instantiateTrees(): void;
    initializeShadows(): void;
    /**
     * Initialize all global variables that will be used in other functions
     */
    initializeGlobalVariables(): void;
    /**
     * We have to initialize textures manually inside code, otherwise they dont show up in production for some reason
     */
    initializeTextures(): void;
    optimizeScene(): void;
}

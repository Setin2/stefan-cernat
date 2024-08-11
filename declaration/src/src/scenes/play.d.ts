import { Node } from "@babylonjs/core/node";
export default class Play extends Node {
    private scene;
    private camera;
    private bullet;
    private tankSound;
    private brickSound;
    private tank;
    private divFps;
    protected constructor();
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
     * Initialize all global variables that will be used in other functions
     */
    initializeGlobalVariables(): void;
    /**
     * We have to initialize textures manually inside code, otherwise they dont show up in production for some reason
     */
    initializeTextures(): void;
    optimizeScene(): void;
}

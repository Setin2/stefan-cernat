import { Node } from "@babylonjs/core/node";
/**
 * The game's entry point: the Babylon.js Editor attaches this script to the scene (see
 * scripts-map.ts), and onInitialize builds everything on top of the imported scene.
 *
 * - core/  engine-level setup: physics, shadows, performance, shared toy-style mesh helpers
 * - tank/  the player tank: model, driving, shooting, tread trail, link targets
 * - world/ everything placed in the world: trees, roads, landmarks, trophies, signs, clouds
 * - ui/    the 2D overlay: help card, target HUD, FPS counter, shared UI style
 */
export default class Play extends Node {
    private scene;
    private camera;
    private tank;
    private toyTank;
    private workCorner;
    private fruitRushButton;
    protected constructor();
    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
     */
    onInitialize(): void;
    private findSceneObjects;
    /** Loaded by hand so the desk monitor's texture loads reliably in production builds. */
    private loadScreenTexture;
    /** Restyles the imported scene and adds everything built in code. Order matters where noted. */
    private buildWorld;
    /**
     * Swaps the imported tank model for the toy tank built in code. Add `?tank=classic` to the URL
     * to get the original model back for comparison.
     */
    private createToyTankModel;
    /** Driving, shooting, the minigames and all the sounds (synthesised, see audio/). After the world is built. */
    private initializeTank;
}

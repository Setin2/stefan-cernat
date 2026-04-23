import { Engine, Scene } from "@babylonjs/core";
export declare class Game {
    /**
     * Defines the engine used to draw the game using Babylon.JS and WebGL.
     */
    engine: Engine;
    /**
     * Defines the scene used to store and draw elements in the canvas.
     */
    scene: Scene;
    private readonly statusOverlay;
    private readonly statusTitle;
    private readonly statusMessage;
    private sceneReady;
    private readonly renderScene;
    /**
     * Constructor.
     */
    constructor();
    /**
     * Loads the first scene.
     */
    private _loadScene;
    private _setStatus;
    private _hideStatus;
    private _getInitialStatusMessage;
    private _syncRenderLoop;
    /**
     * Binds the required events for a full experience.
     */
    private _bindEvents;
    private readonly _handleResize;
    private readonly _handleVisibilityChange;
    private readonly _handleBeforeUnload;
}

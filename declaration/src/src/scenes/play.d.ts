import { Node } from "@babylonjs/core/node";
export default class Play extends Node {
    private scene;
    private camera;
    private bullet;
    private tankSound;
    private brickSound;
    private tank;
    private divFps;
    private controlOverlayTexture;
    private controlOverlayPanel;
    private controlOverlayHint;
    private controlDismissTimer;
    private isAudioMuted;
    private readonly handleControlHotkeys;
    protected constructor();
    /**
     * Called when the node is being initialized.
     * This function is called immediately after the constructor has been called.
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
     * Creates a dedicated shadow-casting light and applies shadows to visible scene meshes.
     */
    initializeShadows(): void;
    /**
     * Creates the reusable help overlay and shows it on first load.
     */
    showControl(): Promise<void>;
    configureFpsCounter(): void;
    /**
     * Initializes the shared scene objects used across the gameplay helpers.
     */
    initializeGlobalVariables(): void;
    /**
     * Initializes textures manually to keep them loading reliably in production builds.
     */
    initializeTextures(): void;
    optimizeScene(): void;
    private disposeControlOverlay;
    private toggleControlOverlay;
    private hideControlOverlay;
    private toggleAudioMute;
    private updateControlHint;
}

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
     * By default Babylon advances cannon.js with one step per frame, sized to the frame time. At
     * 60 fps a shot (200 units/s) moves ~3.3 units per step, about the thickness of a brick, so it
     * can pass straight through; at lower frame rates it gets worse. Splitting each frame into
     * equal sub-steps of at most 1/120s keeps the simulation stable at any frame rate while still
     * advancing exactly the frame's time, so motion stays smooth.
     */
    private configurePhysicsSubsteps;
    /**
     * Initializes textures manually to keep them loading reliably in production builds.
     */
    initializeTextures(): void;
    optimizeScene(): void;
    private clearControlDismissTimer;
    private disposeControlOverlay;
    private toggleControlOverlay;
    private hideControlOverlay;
    private toggleAudioMute;
    private updateControlHint;
}

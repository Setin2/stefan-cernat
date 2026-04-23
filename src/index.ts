import { BabylonFileLoaderConfiguration, Engine, Scene } from "@babylonjs/core";

import { configureEngine } from "./engine-config";

export class Game {
    /**
     * Defines the engine used to draw the game using Babylon.JS and WebGL.
     */
    public engine: Engine;
    /**
     * Defines the scene used to store and draw elements in the canvas.
     */
    public scene: Scene;

    /**
     * Constructor.
     */
    public constructor() {
        const canvas = document.getElementById("renderCanvas");
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Missing #renderCanvas element.");
        }

        this.engine = new Engine(canvas, true);
        configureEngine(this.engine);
        this.scene = new Scene(this.engine);

        this._bindEvents();
        void this._loadScene();
    }

    /**
     * Loads the first scene.
     */
    private async _loadScene(): Promise<void> {
        const rootUrl = "./scenes/_assets/";

        const [_, CANNON, { appendScene }] = await Promise.all([
            import("@babylonjs/materials"),
            import("cannon"),
            import("./scenes/tools"),
        ]);

        BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine = CANNON;

        await appendScene(this.scene, rootUrl, "../scene/scene.babylon");

        // Attach camera.
        if (!this.scene.activeCamera) {
            throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
        }

        this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas(), false);

        // Render.
        this.engine.runRenderLoop(() => this.scene.render());
    }

    /**
     * Binds the required events for a full experience.
     */
    private _bindEvents(): void {
        window.addEventListener("resize", () => this.engine.resize());
    }
}
